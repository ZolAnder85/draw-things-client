package main

import (
	"flag"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
)

func writeBody(serverResponse http.ResponseWriter, targetResponse * http.Response) {
	body, error := ioutil.ReadAll(targetResponse.Body)
	if error == nil {
		serverResponse.Write(body)
	} else {
		serverResponse.WriteHeader(http.StatusInternalServerError)
	}
}

func doRequest(serverResponse http.ResponseWriter, targetRequest * http.Request) {
	client := http.Client { }
	targetResponse, error := client.Do(targetRequest)
	defer targetRequest.Body.Close()
	if error == nil {
		writeBody(serverResponse, targetResponse)
	} else {
		serverResponse.WriteHeader(http.StatusServiceUnavailable)
	}
}

func publicPath() string {
	executable, error := os.Executable()
	if error == nil {
		directory := filepath.Dir(executable);
		return filepath.Join(directory, "public");
	}
	return "public";
}

func main() {
	serverPort := flag.String("serverPort", "8080", "port to run the server")
	targetPort := flag.String("targetPort", "7860", "port of Draw Things")

	flag.Parse()

	parametersTarget := "http://127.0.0.1:" + * targetPort
	generationTarget := parametersTarget + "/sdapi/v1/txt2img"

	http.Handle("/", http.FileServer(http.Dir(publicPath())))

	http.HandleFunc("/parameters", func(serverResponse http.ResponseWriter, serverRequest * http.Request) {
		targetRequest, error := http.NewRequest(serverRequest.Method, parametersTarget, serverRequest.Body)
		if error == nil {
			doRequest(serverResponse, targetRequest)
		} else {
			serverResponse.WriteHeader(http.StatusInternalServerError)
		}
	})

	http.HandleFunc("/generate", func(serverResponse http.ResponseWriter, serverRequest * http.Request) {
		targetRequest, error := http.NewRequest(serverRequest.Method, generationTarget, serverRequest.Body)
		if error == nil {
			doRequest(serverResponse, targetRequest)
		} else {
			serverResponse.WriteHeader(http.StatusInternalServerError)
		}
	})

	http.ListenAndServe(":" + * serverPort, nil)
}