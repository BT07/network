package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

const (
	BU = "Blockcoderz"
)

// SimpleChaincode example simple Chaincode implementation
type SimpleChaincode struct {
}

type student struct {
	PR_no             string `json:"PR_no"`
	Password          string `json:"Password"`
	First_Name        string `json:"First_Name"`
	Middle_Name       string `json:"Middle_Name "`
	Last_Name         string `json:"Last_Name"`
	College_Name      string `json:"College_Name"`
	Branch            string `json:"Branch"`
	Year_Of_Admission string `json:"Year_Of_Admission"`
	Email_Id          string `json:"Email_Id"`
	Mobile            string `json:"Mobile"`
}

type cert struct {
	PR_no           string `json:"PR_no"`
	Student_Name    string `json:"Student_Name"`
	College_Name    string `json:"College_Name"`
	Seat_no         string `json:"Seat_no"`
	Examination     string `json:"Examination"`
	Year_Of_Passing string `json:"Year_Of_Passing"`
	Sub             string `json:"Sub"`
}

type user struct {
	Username string `json:"Username"`
	Password string `json:"Password"`
}

// ===========================
// main function starts up the chaincode in the container during instantiate
func main() {
	err := shim.Start(new(SimpleChaincode))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}

// ===========================
// Init initializes chaincode
func (t *SimpleChaincode) Init(APIstub shim.ChaincodeStubInterface) pb.Response {
	return shim.Success(nil)
}

// ========================================
// Invoke - Our entry point for Invocations
func (t *SimpleChaincode) Invoke(APIstub shim.ChaincodeStubInterface) pb.Response {
	function, args := APIstub.GetFunctionAndParameters()
	// Handle different functions

	if function == "addStudent" { //add a Student
		return t.addStudent(APIstub, args)
	} else if function == "readStudent" { //read a Student
		return t.readStudent(APIstub, args)
	} else if function == "addCert" { //add a Certificate
		return t.addCert(APIstub, args)
	} else if function == "readCert" { //read a Certificate
		return t.readCert(APIstub, args)
	} else if function == "transferCert" { //transfer a Certificate
		return t.transferCert(APIstub, args)
	} else if function == "initLedger" {
		return t.initLedger(APIstub, args)
	} else if function == "queryAllCert" {
		return t.queryAllCert(APIstub, args)
	} else if function == "login" {
		return t.login(APIstub, args)
	} else if function == "uniCredentials" {
		return t.uniCredentials(APIstub, args)
	} else if function == "creatorCredentials" {
		return t.creatorCredentials(APIstub, args)
	}
	return shim.Error("Received unknown function invocation")

}

// ===============================================
// readcert - read a certificate from chaincode state
func (t *SimpleChaincode) readCert(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {
	var name, jsonResp string
	var err error
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	name = args[0]
	valAsbytes, err := APIstub.GetState(name)
	if err != nil {
		jsonResp = "{\"Error\":\"Failed to get state for " + name + "\"}"
		return shim.Error(jsonResp)
	} else if valAsbytes == nil {
		jsonResp = "{\"Error\":\"Certificate does not exist: " + name + "\"}"
		return shim.Error(jsonResp)
	}
	return shim.Success(valAsbytes)
}

/*
 * The initLedger method *
Will add test data (10 cert catches)to our network
*/
//PR_no,Student_Name,Seat_no,College_Name,Examination,Year_Of_Passing,Sub
func (t *SimpleChaincode) initLedger(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {
	Cert := []cert{
		cert{PR_no: "101", Student_Name: "Gaurav1", Seat_no: "1", College_Name: "PCCE", Examination: "may/june", Year_Of_Passing: "2019", Sub: "abc"},
		cert{PR_no: "102", Student_Name: "Gaurav2", Seat_no: "2", College_Name: "PCCE", Examination: "may/june", Year_Of_Passing: "2019", Sub: "abc"},
		cert{PR_no: "103", Student_Name: "Gaurav3", Seat_no: "3", College_Name: "PCCE", Examination: "may/june", Year_Of_Passing: "2019", Sub: "abc"},
		cert{PR_no: "104", Student_Name: "Gaurav4", Seat_no: "4", College_Name: "PCCE", Examination: "may/june", Year_Of_Passing: "2019", Sub: "abc"},
	}

	i := 0
	for i < len(Cert) {
		fmt.Println("i is ", i)
		valAsBytes, _ := json.Marshal(Cert[i])
		APIstub.PutState(strconv.Itoa(i+1), valAsBytes)
		fmt.Println("Added", Cert[i])
		i = i + 1
	}

	// ==== Create student object and marshal to JSON ====
	student := &student{"123", "123", "G", "U", "S", "PCCE", "IT", "2015", "g@gmail.com", "8007067665"}
	studentJSONasBytes, _ := json.Marshal(student)
	// === Save student to state ===
	APIstub.PutState("123", studentJSONasBytes)

	return shim.Success(nil)
}

func (t *SimpleChaincode) queryAllCert(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {

	startKey := "0"
	endKey := "999"

	resultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryResults
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add comma before array members,suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- queryAllCert:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}

// add certificate details
//PR_no,Student_Name,Seat_no,College_Name,Examination,Year_Of_Passing,Sub
func (t *SimpleChaincode) addCert(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 6 {
		return shim.Error("Incorrect number of arguments. Expecting 5")
	}
	if len(args[0]) <= 0 {
		return shim.Error("1 argument must be a non-empty string")
	}
	if len(args[1]) <= 0 {
		return shim.Error("2 argument must be a non-empty string")
	}
	if len(args[2]) <= 0 {
		return shim.Error("3 argument must be a non-empty string")
	}
	if len(args[3]) <= 0 {
		return shim.Error("4 argument must be a non-empty string")
	}
	if len(args[4]) <= 0 {
		return shim.Error("5 argument must be a non-empty string")
	}
	if len(args[5]) <= 0 {
		return shim.Error("6 argument must be a non-empty string")
	}

	PRno := args[0]
	CName := args[1]
	Seatno := args[2]
	examination := args[3]
	YOP := args[4]
	sub := args[5]

	// ==== Check if certificate already exists ====
	certAsBytes, err := APIstub.GetState(Seatno)
	if err != nil {
		return shim.Error("Failed to get certificate: " + err.Error())
	} else if certAsBytes != nil {
		return shim.Error("This certificate already exists: " + PRno)
	}

	// ==== Create certificate object and marshal to JSON ====
	cert := &cert{PRno, BU, CName, Seatno, examination, YOP, sub}

	certJSONasBytes, err := json.Marshal(cert)
	err = APIstub.PutState(Seatno, certJSONasBytes)
	if err != nil {
		return shim.Error(fmt.Sprintf("Failed to record Cert: %s", Seatno))
	}

	return shim.Success(nil)
}

// ========================================================================
// transferCert - transfer ownership of cert from BlockCoderz to Student
func (t *SimpleChaincode) transferCert(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {
	//   0       1
	// "Seatno", "SName"
	if len(args) < 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}
	Seatno := args[0]
	SName := args[1]

	certAsBytes, err := APIstub.GetState(Seatno)
	if certAsBytes == nil {
		return shim.Error("Could not locate Cert")
	}
	certToTransfer := cert{}
	json.Unmarshal(certAsBytes, &certToTransfer) //unmarshal it aka JSON.parse()

	certToTransfer.Student_Name = SName //change the owner

	certJSONasBytes, _ := json.Marshal(certToTransfer)
	err = APIstub.PutState(Seatno, certJSONasBytes) //rewrite the certificate
	if err != nil {
		return shim.Error(fmt.Sprintf("Failed to change Cert holder: %s", Seatno))
	}

	return shim.Success(nil)
}

// ========================================
// add student details
// PR_no,password,First_Name,Middle_Name,Last_Name,College_Name,Branch,Year_Of_Admission,Email_Id,Mobile
func (t *SimpleChaincode) addStudent(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 10 {
		return shim.Error("Incorrect number of arguments. Expecting 9")
	}

	// ==== Input sanitation ====
	fmt.Println("- start")
	if len(args[0]) <= 0 {
		return shim.Error("1 argument must be a non-empty string")
	}
	if len(args[1]) <= 0 {
		return shim.Error("2 argument must be a non-empty string")
	}
	if len(args[2]) <= 0 {
		return shim.Error("3 argument must be a non-empty string")
	}
	if len(args[3]) <= 0 {
		return shim.Error("4 argument must be a non-empty string")
	}
	if len(args[4]) <= 0 {
		return shim.Error("5 argument must be a non-empty string")
	}
	if len(args[5]) <= 0 {
		return shim.Error("6 argument must be a non-empty string")
	}
	if len(args[6]) <= 0 {
		return shim.Error("7 argument must be a non-empty string")
	}
	if len(args[7]) <= 0 {
		return shim.Error("8 argument must be a non-empty string")
	}
	if len(args[8]) <= 0 {
		return shim.Error("9 argument must be a non-empty string")
	}
	if len(args[9]) <= 0 {
		return shim.Error("9 argument must be a non-empty string")
	}

	PRno := args[0]
	password := args[1]
	FName := args[2]
	MName := args[3]
	LName := args[4]
	CName := args[5]
	branch := args[6]
	YOA := args[7]
	EId := args[8]
	mobile := args[9]

	// ==== Check if Student already exists ====
	studentAsBytes, err := APIstub.GetState(PRno)
	if err != nil {
		return shim.Error("Failed to get student: " + err.Error())
	} else if studentAsBytes != nil {
		return shim.Error("This student already exists: " + PRno)
	}

	// ==== Create student object and marshal to JSON ====
	student := &student{PRno, password, FName, MName, LName, CName, branch, YOA, EId, mobile}
	studentJSONasBytes, err := json.Marshal(student)
	if err != nil {
		return shim.Error(err.Error())
	}

	// === Save student to state ===
	err = APIstub.PutState(PRno, studentJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	// ==== student saved and indexed. Return success ====
	fmt.Println("- end Add Student")
	return shim.Success(nil)
}

// ===============================================
// readStudent - read a Student from chaincode state
func (t *SimpleChaincode) readStudent(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {
	var name, jsonResp string
	var err error

	if len(args) <= 0 {
		return shim.Error("Incorrect number of arguments. Expecting name of the name to query")
	}

	name = args[0]
	valAsbytes, err := APIstub.GetState(name)
	if err != nil {
		jsonResp = "{\"Error\":\"Failed to get state for " + name + "\"}"
		return shim.Error(jsonResp)
	} else if valAsbytes == nil {
		jsonResp = "{\"Error\":\"Student does not exist: " + name + "\"}"
		return shim.Error(jsonResp)
	}
	return shim.Success(valAsbytes)
}

// ========================================================================
// login - username password
func (t *SimpleChaincode) login(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {
	//   0       1
	// "prno", "password"
	if len(args) < 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}
	prno := args[0]
	password := args[1]
	studentAsBytes, err := APIstub.GetState(prno)
	if err != nil {
		opJSONasBytes, _ := json.Marshal("failure")

		return shim.Success(opJSONasBytes)

	} else if studentAsBytes == nil {
		opJSONasBytes, _ := json.Marshal("failure")

		return shim.Success(opJSONasBytes)
	}

	studentAuthentication := student{}
	json.Unmarshal(studentAsBytes, &studentAuthentication) //unmarshal it aka JSON.parse()

	if studentAuthentication.Password == password {
		opJSONasBytes, _ := json.Marshal("success")

		return shim.Success(opJSONasBytes)
	} else {
		opJSONasBytes, _ := json.Marshal("failure")

		return shim.Success(opJSONasBytes)
	}
}

// add University credentials
//Username, Password
func (t *SimpleChaincode) uniCredentials(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}
	if len(args[0]) <= 0 {
		return shim.Error("1 argument must be a non-empty string")
	}
	if len(args[1]) <= 0 {
		return shim.Error("2 argument must be a non-empty string")
	}

	Username := args[0]
	Password := args[1]

	// ==== Check if credentials already exists ====
	credentialAsBytes, err := APIstub.GetState(Username)
	if err != nil {
		return shim.Error("Failed to get credentials: " + err.Error())
	} else if credentialsAsBytes != nil {
		return shim.Error("This credentials already exists: " + Username)
	}

	// ==== Create certificate object and marshal to JSON ====
	universityLogin := &user{Username, Password}

	credentialJSONasBytes, err := json.Marshal(user)
	err = APIstub.PutState(Username, credentialJSONasBytes)
	if err != nil {
		return shim.Error(fmt.Sprintf("Failed to add university credentials: %s", Username))
	}

	return shim.Success(nil)
}

// add Creator credentials
//Username, Password
func (t *SimpleChaincode) creatorCredentials(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}
	if len(args[0]) <= 0 {
		return shim.Error("1 argument must be a non-empty string")
	}
	if len(args[1]) <= 0 {
		return shim.Error("2 argument must be a non-empty string")
	}

	Username := args[0]
	Password := args[1]

	// ==== Check if credentials already exists ====
	credentialAsBytes, err := APIstub.GetState(Username)
	if err != nil {
		return shim.Error("Failed to get credentials: " + err.Error())
	} else if credentialsAsBytes != nil {
		return shim.Error("This credentials already exists: " + Username)
	}

	// ==== Create certificate object and marshal to JSON ====
	creatorLogin := &user{Username, Password}

	credentialJSONasBytes, err := json.Marshal(user)
	err = APIstub.PutState(Username, credentialJSONasBytes)
	if err != nil {
		return shim.Error(fmt.Sprintf("Failed to add creator credentials: %s", Username))
	}

	return shim.Success(nil)
}
