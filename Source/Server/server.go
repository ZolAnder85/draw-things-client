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
	"regexp"
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
	ImageName string `json:"imageName"`
	TaskData TaskData `json:"taskData"`
	GenTime int `json:"genTime"`
	ID int `json:"ID"`
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

func defaultsPath() string {
	return webAppPath + "/defaults.json"
}

func settingsPath() string {
	return resultsPath + "/settings.json"
}

func historyPath(project string) string {
	return resultsPath + "/" + project + "/history.json"
}

func imagePath(project string, ID int) string {
	return fmt.Sprintf("%v/%v/%05d.png", resultsPath, project, ID)
}

func imageName(ID int) string {
	return fmt.Sprintf("%05d.png?%05d", ID, rand.Intn(100000))
}

// response converters

type ResponseConverter func(project string, requestBody []byte, responseBody []byte, genTime int) []byte

func dummyResponseConverter(project string, requestBody []byte, responseBody []byte, genTime int) []byte {
	return responseBody;
}

func saveResult(encodedTask []byte, encodedImage string, genTime int, project string, ID int) GenData {
	decodedImage, _ := base64.StdEncoding.DecodeString(encodedImage)
	imagePath := imagePath(project, ID);
	os.WriteFile(imagePath, decodedImage, 0700)
	imageName := imageName(ID)
	taskData := taskDataFromBytes(encodedTask)

	imageString := string(decodedImage)
	seedRExp := regexp.MustCompile(`"seed":(\d+)`)
	matches := seedRExp.FindAllStringSubmatch(imageString, 1)
	if len(matches) > 0 {
		match := matches[0]
		if len(match) > 1 {
			seed, err := strconv.Atoi(match[1])
			if err == nil {
				taskData["seed"] = seed
			}
		}
	}

	return GenData { imageName, taskData, genTime, ID }
}

func generationConverter(project string, requestBody []byte, responseBody []byte, genTime int) []byte {
	exec.Command("mkdir", "-p", resultsPath + "/" + project).Run()
	historyData := genListFromFile(historyPath(project))
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
		genData := saveResult(requestBody, encodedImage, genTime, project, ID)
		historyData = append(historyData, genData)
		resultData = append(resultData, genData)
	}
	saveGenList(historyData, historyPath(project));
	return bytesFromGenList(resultData);
}

// reqest converters

type RequestConverter func(project string, requestBody []byte) []byte

func dummyRequestConverter(project string, requestBody []byte) []byte {
	return requestBody
}

func getHistoryConverter(project string, requestBody []byte) []byte {
	var result []byte
	result, _ = os.ReadFile(historyPath(project))
	if result == nil {
		return []byte("[]")
	}
	return result
}

func searchID(historyData []GenData, ID int, skipStart int, skipEnd int) int {
	length := len(historyData)
	for i := skipStart; i < length - skipEnd; i++ {
		genData := historyData[i]
		if genData.ID == ID {
			return i
		}
	}
	return -1;
}

func moveGenPrevConverter(project string, requestBody []byte) []byte {
	ID, _ := strconv.Atoi(string(requestBody))
	historyData := genListFromFile(historyPath(project))
	index := searchID(historyData, ID, 1, 0)
	if index < 0 {
		return []byte{}
	}
	genData := historyData[index]
	historyData[index] = historyData[index - 1]
	historyData[index - 1] = genData
	saveGenList(historyData, historyPath(project))
	return []byte{}
}

func moveGenNextConverter(project string, requestBody []byte) []byte {
	ID, _ := strconv.Atoi(string(requestBody))
	historyData := genListFromFile(historyPath(project))
	index := searchID(historyData, ID, 0, 1)
	if index < 0 {
		return []byte{}
	}
	genData := historyData[index]
	historyData[index] = historyData[index + 1]
	historyData[index + 1] = genData
	saveGenList(historyData, historyPath(project))
	return []byte{}
}

func removeGenConverter(project string, requestBody []byte) []byte {
	ID, _ := strconv.Atoi(string(requestBody))
	os.Remove(imagePath(project, ID))
	historyData := genListFromFile(historyPath(project))
	index := searchID(historyData, ID, 0, 0)
	if index < 0 {
		return []byte{}
	}
	before := historyData[:index]
	index++
	after := historyData[index:]
	historyData = append(before, after...)
	saveGenList(historyData, historyPath(project))
	return []byte{}
}

func clearHistoryConverter(project string, requestBody []byte) []byte {
	historyData := genListFromFile(historyPath(project))
	for _, genData := range historyData {
		os.Remove(imagePath(project, genData.ID))
	}
	os.Remove(historyPath(project))
	return []byte{}
}

func settingsRequestConverter(project string, requestBody []byte) []byte {
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
		project := serverRequest.Header.Get("project")
		convertedRequestBody := requestConverter(project, requestBody)
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
		convertedResponseBody := responseConverter(project, requestBody, responseBody, int(genTime))
		serverResponse.Write(convertedResponseBody)
	}
}

func createSimpleHandler(requestConverter RequestConverter) http.HandlerFunc {
	return func(serverResponse http.ResponseWriter, serverRequest * http.Request) {
		requestBody, err := io.ReadAll(serverRequest.Body)
		if checkError(err, serverResponse, http.StatusInternalServerError, "Error reading request body.") {
			return
		}
		project := serverRequest.Header.Get("project")
		convertedRequestBody := requestConverter(project, requestBody)
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
	http.HandleFunc("/move-gen-prev", createSimpleHandler(moveGenPrevConverter))
	http.HandleFunc("/move-gen-next", createSimpleHandler(moveGenNextConverter))
	http.HandleFunc("/remove-gen", createSimpleHandler(removeGenConverter))
	http.HandleFunc("/clear-history", createSimpleHandler(clearHistoryConverter))
	http.HandleFunc("/settings", createSimpleHandler(settingsRequestConverter))

	http.ListenAndServe(":" + * serverPort, nil)
}