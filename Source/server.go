package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
)

type TaskData map[string]interface{}

func taskDataFromBytes(bytes []byte) TaskData {
	var result TaskData
	json.Unmarshal(bytes, & result)
	return result
}

type ResponseData struct {
	Images []string `json:"images"`
}

func responseDataFromBytes(bytes []byte) ResponseData {
	var result ResponseData
	json.Unmarshal(bytes, & result)
	return result
}

type GenData struct {
	ImageURL string `json:"imageURL"`
	TaskData TaskData `json:"taskData"`
	Seconds int `json:"seconds"`
	ID int `json:"ID"`
}

func saveGenData(data GenData, path string) {
	bytes, _ := json.MarshalIndent(data, "", "\t")
	os.WriteFile(path, bytes, 0600)
}

func saveImage(encodedImage string, path string) {
	decodedImage, _ := base64.StdEncoding.DecodeString(encodedImage)
	os.WriteFile(path, decodedImage, 0600)
}

// TODO: Return empty array instead of nil.
func genListFromFile(path string) []GenData {
	var result []GenData
	bytes, _ := os.ReadFile(path)
	json.Unmarshal(bytes, & result)
	return result
}

func bytesFromGenList(genList []GenData) []byte {
	bytes, _ := json.Marshal(genList)
	return bytes
}

func saveGenList(genList []GenData, path string) {
	bytes, _ := json.MarshalIndent(genList, "", "\t")
	os.WriteFile(path, bytes, 0700)
}

// TODO: Store this in a variable.
func publicPath() string {
	executable, error := os.Executable()
	if error == nil {
		directory := filepath.Dir(executable);
		return filepath.Join(directory, "public");
	}
	return "public";
}

// TODO: Store this in a variable.
func resultsPath() string {
	executable, error := os.Executable()
	if error == nil {
		directory := filepath.Dir(executable);
		return filepath.Join(directory, "results");
	}
	return "results";
}

// TODO: Store this in a variable.
func historyPath() string {
	return resultsPath() + "/history.json"
}

func dataPath(ID int) string {
	return resultsPath() + "/" + fmt.Sprintf("%08d", ID) + ".json"
}

func imagePath(ID int) string {
	return resultsPath() + "/" + fmt.Sprintf("%08d", ID) + ".png"
}

func imageURL(ID int) string {
	return "results/" + fmt.Sprintf("%08d", ID) + ".png"
}

type ResponseConverter func(requestBody []byte, responseBody []byte) []byte

func dummyResponseConverter(requestBody []byte, responseBody []byte) []byte {
	return responseBody;
}

func saveResult(encodedTask []byte, encodedImage string, ID int) GenData {
	imageURL := imageURL(ID)
	taskData := taskDataFromBytes(encodedTask)
	genData := GenData { imageURL, taskData, 0, ID }
	saveGenData(genData, dataPath(ID))
	saveImage(encodedImage, imagePath(ID))
	return genData
}

func generationConverter(requestBody []byte, responseBody []byte) []byte {
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
		genData := saveResult(requestBody, encodedImage, ID)
		historyData = append(historyData, genData)
		resultData = append(resultData, genData)
	}
	saveGenList(historyData, historyPath());
	return bytesFromGenList(resultData);
}

// TODO: Return empty array instead of nil.
func getHistoryConverter(requestBody []byte) []byte {
	historyBytes, _ := os.ReadFile(historyPath())
	return historyBytes
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
		os.Remove(dataPath(genData.ID))
		os.Remove(imagePath(genData.ID))
	}
	os.Remove(historyPath())
	return []byte{}
}

type RequestConverter func(requestBody []byte) []byte

func dummyRequestConverter(requestBody []byte) []byte {
	return requestBody
}

func checkError(err error, serverResponse http.ResponseWriter, status int, message string) bool {
	if err == nil {
		return false
	}
	http.Error(serverResponse, message, status)
	return true
}

func createTargetHandler(requestConverter RequestConverter, responseConverter ResponseConverter, targetURL string) http.HandlerFunc {
	return func(serverResponse http.ResponseWriter, serverRequest * http.Request) {
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
		convertedResponseBody := responseConverter(requestBody, responseBody)
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

func main() {
	serverPort := flag.String("serverPort", "8080", "port to run the server")
	targetPort := flag.String("targetPort", "7860", "port of Draw Things")

	flag.Parse()

	publicServer := http.FileServer(http.Dir(publicPath()))
	http.Handle("/", publicServer)

	// TODO: Think about this.
	resultsServer := http.FileServer(http.Dir(resultsPath()))
	resultsStrip := http.StripPrefix("/results/", resultsServer)
	http.Handle("/results/", resultsStrip)

	parametersTarget := "http://127.0.0.1:" + * targetPort
	generationTarget := parametersTarget + "/sdapi/v1/txt2img"

	http.HandleFunc("/parameters", createTargetHandler(dummyRequestConverter, dummyResponseConverter, parametersTarget))
	http.HandleFunc("/generate", createTargetHandler(dummyRequestConverter, generationConverter, generationTarget))

	http.HandleFunc("/get-history", createSimpleHandler(getHistoryConverter))
	http.HandleFunc("/remove-generation", createSimpleHandler(removeGenerationConverter))
	http.HandleFunc("/clear-history", createSimpleHandler(clearHistoryConverter))

	http.ListenAndServe(":" + * serverPort, nil)
}