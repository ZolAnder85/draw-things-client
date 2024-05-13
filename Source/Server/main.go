package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"strconv"
	"time"
)

// data types

type TaskData map[string]interface{}

func taskDataFromBytes(bytes []byte) (result TaskData) {
	json.Unmarshal(bytes, & result)
	return
}

type ResponseData struct {
	Images []string `json:"images"`
}

func responseDataFromBytes(bytes []byte) (result ResponseData) {
	json.Unmarshal(bytes, & result)
	return
}

type GenData struct {
	ImageURL string `json:"imageURL"`
	TaskData TaskData `json:"taskData"`
	GenTime int `json:"genTime"`
	ID int `json:"ID"`
}

func saveImage(encodedImage string, path string) {
	decodedImage, _ := base64.StdEncoding.DecodeString(encodedImage)
	os.WriteFile(path, decodedImage, 0700)
}

func genListFromFile(path string) []GenData {
	var result []GenData
	bytes, _ := os.ReadFile(path)
	json.Unmarshal(bytes, & result)
	if result == nil {
		return []GenData{}
	}
	return result
}

func bytesFromGenList(genList []GenData) (result []byte) {
	result, _ = json.Marshal(genList)
	return
}

func saveGenList(genList []GenData, path string) {
	bytes, _ := json.MarshalIndent(genList, "", "\t")
	os.WriteFile(path, bytes, 0700)
}

// paths for saving

func historyPath() string {
	return fmt.Sprintf("%v/history.json", resultsPath)
}

func settingsPath() string {
	return fmt.Sprintf("%v/settings.json", resultsPath)
}

func defaultsPath() string {
	return fmt.Sprintf("%v/defaults.json", webAppPath)
}

func imagePath(ID int) string {
	return fmt.Sprintf("%v/%05d.png", resultsPath, ID)
}

func imageURL(ID int) string {
	return fmt.Sprintf("results/%05d.png?%05d", ID, rand.Intn(100000))
}

// response converters

type ResponseConverter func(requestBody []byte, responseBody []byte, genTime int) []byte

func dummyResponseConverter(requestBody []byte, responseBody []byte, genTime int) []byte {
	return responseBody;
}

func saveResult(encodedTask []byte, encodedImage string, genTime int, ID int) GenData {
	saveImage(encodedImage, imagePath(ID))
	imageURL := imageURL(ID)
	taskData := taskDataFromBytes(encodedTask)
	return GenData { imageURL, taskData, genTime, ID }
}

func generationConverter(requestBody []byte, responseBody []byte, genTime int) []byte {
	historyData := genListFromFile(historyPath())
	ID := 0
	for _, genData := range historyData {
		if ID < genData.ID {
			ID = genData.ID
		}
	}
	var resultData []GenData
	responseData := responseDataFromBytes(responseBody)
	for _, encodedImage := range responseData.Images {
		ID++
		genTime := genTime / len(responseData.Images)
		genData := saveResult(requestBody, encodedImage, genTime, ID)
		historyData = append(historyData, genData)
		resultData = append(resultData, genData)
	}
	saveGenList(historyData, historyPath());
	return bytesFromGenList(resultData);
}

// reqest converter

type RequestConverter func(requestBody []byte) []byte

func dummyRequestConverter(requestBody []byte) []byte {
	return requestBody
}

func getHistoryConverter(requestBody []byte) []byte {
	var result []byte
	result, _ = os.ReadFile(historyPath())
	if result == nil {
		return []byte("[]")
	}
	return result
}

func removeGenerationConverter(requestBody []byte) []byte {
	ID, _ := strconv.Atoi(string(requestBody))
	os.Remove(dataPath(ID))
	os.Remove(imagePath(ID))
	historyData := genListFromFile(historyPath())
	for index, genData := range historyData {
		if genData.ID == ID {
			before := historyData[:index]
			index++
			after := historyData[index:]
			newHistory := append(before, after...)
			saveGenList(newHistory, historyPath())
			return []byte{}
		}
	}
	return []byte{}
}

func clearHistoryConverter(requestBody []byte) []byte {
	historyData := genListFromFile(historyPath())
	for _, genData := range historyData {
		os.Remove(imagePath(genData.ID))
	}
	os.Remove(historyPath())
	return []byte{}
}

func settingsRequestConverter(requestBody []byte) []byte {
	var result []byte
	result, _ = os.ReadFile(settingsPath())
	if result == nil {
		return []byte("{}")
	}
	return result
}

// common handling

func checkError(err error, serverResponse http.ResponseWriter, status int, message string) bool {
	if err == nil {
		return false
	}
	http.Error(serverResponse, message, status)
	return true
}

func createTargetHandler(requestConverter RequestConverter, responseConverter ResponseConverter, targetURL string) http.HandlerFunc {
	return func(serverResponse http.ResponseWriter, serverRequest * http.Request) {
		start := time.Now()
		requestBody, err := io.ReadAll(serverRequest.Body)
		if checkError(err, serverResponse, http.StatusInternalServerError, "Error reading request body.") {
			return
		}
		convertedRequestBody := requestConverter(requestBody)
		targetRequest, err := http.NewRequest(serverRequest.Method, targetURL, bytes.NewBuffer(convertedRequestBody))
		if checkError(err, serverResponse, http.StatusInternalServerError, "Error creating target request.") {
			return
		}
		targetResponse, err := http.DefaultClient.Do(targetRequest)
		if checkError(err, serverResponse, http.StatusServiceUnavailable, "Target server can not be reached.") {
			return
		}
		defer targetResponse.Body.Close()
		responseBody, err := io.ReadAll(targetResponse.Body)
		if checkError(err, serverResponse, http.StatusInternalServerError, "Error reading response body.") {
			return
		}
		delta := time.Since(start)
		genTime := delta.Milliseconds()
		convertedResponseBody := responseConverter(requestBody, responseBody, int(genTime))
		serverResponse.Write(convertedResponseBody)
	}
}

func createSimpleHandler(requestConverter RequestConverter) http.HandlerFunc {
	return func(serverResponse http.ResponseWriter, serverRequest * http.Request) {
		requestBody, err := io.ReadAll(serverRequest.Body)
		if checkError(err, serverResponse, http.StatusInternalServerError, "Error reading request body.") {
			return
		}
		convertedRequestBody := requestConverter(requestBody)
		serverResponse.Write(convertedRequestBody)
	}
}

// main function

var webAppPath string
var resultsPath string

func main() {
	serverPort := flag.String("serverPort", "8080", "port to run the server")
	targetPort := flag.String("targetPort", "7860", "port of Draw Things")

	flag.Parse()

	executable, _ := os.Executable()
	webAppPath = filepath.Dir(executable) + "/../Resources"
	currentUser, _ := user.Current()
	resultsPath = currentUser.HomeDir + "/DTC"
	exec.Command("mkdir", "-p", resultsPath).Run()
	exec.Command("cp", "-n", defaultsPath(), settingsPath()).Run()

	rand.Seed(time.Now().UnixNano())

	publicServer := http.FileServer(http.Dir(webAppPath))
	http.Handle("/", publicServer)
	resultsServer := http.FileServer(http.Dir(resultsPath))
	resultsStrip := http.StripPrefix("/results/", resultsServer)
	http.Handle("/results/", resultsStrip)

	parametersTarget := "http://127.0.0.1:" + * targetPort
	generationTarget := parametersTarget + "/sdapi/v1/txt2img"

	// TODO: Add models to options if missing.
	http.HandleFunc("/parameters", createTargetHandler(dummyRequestConverter, dummyResponseConverter, parametersTarget))
	http.HandleFunc("/generate", createTargetHandler(dummyRequestConverter, generationConverter, generationTarget))

	http.HandleFunc("/get-history", createSimpleHandler(getHistoryConverter))
	http.HandleFunc("/remove-generation", createSimpleHandler(removeGenerationConverter))
	http.HandleFunc("/clear-history", createSimpleHandler(clearHistoryConverter))
	http.HandleFunc("/settings", createSimpleHandler(settingsRequestConverter))

	http.ListenAndServe(":" + * serverPort, nil)
}