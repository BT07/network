package main

import (
	"encoding/json"
	"fmt"

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

// ===========================
// main function starts up the chaincode in the container during instantiate
func main() {
	if err := shim.Start(new(SimpleChaincode)); err != nil {
		fmt.Printf("Error starting SimpleAsset chaincode: %s", err)
	}
}

// ===========================
// Init initializes chaincode
func (t *SimpleChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	return shim.Success(nil)
}

// ========================================
// Invoke - Our entry point for Invocations
func (t *SimpleChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	fmt.Println("invoke is running " + function)
	// Handle different functions
	if function == "addStudent" { //add a Student
		return t.addStudent(stub, args)
	} else if function == "readStudent" { //read a Student
		return t.readStudent(stub, args)
	} else if function == "addCert" { //add a Certificate
		return t.addCert(stub, args)
	} else if function == "readCert" { //read a Certificate
		return t.readCert(stub, args)
	} else if function == "transferCert" { //transfer a Certificate
		return t.transferCert(stub, args)
	}

	fmt.Println("invoke did not find func: " + function) //error
	return shim.Error("Received unknown function invocation")
}

// ========================================
// add student details
// PR_no,First_Name,Middle_Name,Last_Name,College_Name,Branch,Year_Of_Admission,Email_Id,Mobile
func (t *SimpleChaincode) addStudent(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 9 {
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

	PRno := args[0]
	FName := args[1]
	MName := args[2]
	LName := args[3]
	CName := args[4]
	branch := args[5]
	YOA := args[6]
	EId := args[7]
	mobile := args[8]

	// ==== Check if Student already exists ====
	studentAsBytes, err := stub.GetState(PRno)
	if err != nil {
		return shim.Error("Failed to get student: " + err.Error())
	} else if studentAsBytes != nil {
		fmt.Println("This student already exists: " + PRno)
		return shim.Error("This student already exists: " + PRno)
	}

	// ==== Create student object and marshal to JSON ====
	student := &student{PRno, FName, MName, LName, CName, branch, YOA, EId, mobile}
	studentJSONasBytes, err := json.Marshal(student)
	if err != nil {
		return shim.Error(err.Error())
	}

	// === Save student to state ===
	err = stub.PutState(PRno, studentJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	// ==== student saved and indexed. Return success ====
	fmt.Println("- end Add Student")
	return shim.Success(nil)
}

// ===============================================
// readStudent - read a Student from chaincode state
func (t *SimpleChaincode) readStudent(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var name, jsonResp string
	var err error

	if len(args) <= 0 {
		return shim.Error("Incorrect number of arguments. Expecting name of the name to query")
	}

	name = args[0]
	valAsbytes, err := stub.GetState(name)
	if err != nil {
		jsonResp = "{\"Error\":\"Failed to get state for " + name + "\"}"
		return shim.Error(jsonResp)
	} else if valAsbytes == nil {
		jsonResp = "{\"Error\":\"Student does not exist: " + name + "\"}"
		return shim.Error(jsonResp)
	}
	return shim.Success(valAsbytes)
}

// add certificate details
//PR_no,Student_Name,Seat_no,College_Name,Examination,Year_Of_Passing,Sub
func (t *SimpleChaincode) addCert(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 7 {
		return shim.Error("Incorrect number of arguments. Expecting 7")
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
	PRno := args[0]
	SName := args[1]
	CName := args[2]
	Seatno := args[3]
	examination := args[4]
	YOP := args[5]
	sub := args[6]

	// ==== Check if certificate already exists ====
	certAsBytes, err := stub.GetState(Seatno)
	if err != nil {
		return shim.Error("Failed to get certificate: " + err.Error())
	} else if certAsBytes != nil {
		fmt.Println("This certificate already exists: " + PRno)
		return shim.Error("This certificate already exists: " + PRno)
	}

	// ==== Create certificate object and marshal to JSON ====
	cert := &cert{PRno, SName, CName, Seatno, examination, YOP, sub}

	certJSONasBytes, err := json.Marshal(cert)
	if err != nil {
		return shim.Error(err.Error())
	}

	// === Save certificate to state ===
	err = stub.PutState(Seatno, certJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	// ==== certificate saved and indexed. Return success ====
	fmt.Println("- end Add cert")
	return shim.Success(nil)
}

// ===============================================
// readcert - read a certificate from chaincode state
func (t *SimpleChaincode) readCert(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var name, jsonResp string
	var err error

	if len(args) <= 0 {
		return shim.Error("Incorrect number of arguments. Expecting name of the name to query")
	}

	name = args[0]
	valAsbytes, err := stub.GetState(name)
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
// transferCert - transfer ownership of cert from BlockCoderz to Student
func (t *SimpleChaincode) transferCert(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	//   0       1
	// "Seatno", "SName"
	if len(args) < 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	Seatno := args[0]
	SName := args[1]

	fmt.Println("- start transferCert ", BU, Seatno, SName)

	certAsBytes, err := stub.GetState(Seatno)
	if err != nil {
		return shim.Error("Failed to get Certificate:" + err.Error())
	} else if certAsBytes == nil {
		return shim.Error("Certificate does not exist")
	}

	certToTransfer := cert{}
	err = json.Unmarshal(certAsBytes, &certToTransfer) //unmarshal it aka JSON.parse()
	if err != nil {
		return shim.Error(err.Error())
	}
	certToTransfer.Student_Name = SName //change the owner

	certJSONasBytes, _ := json.Marshal(certToTransfer)
	err = stub.PutState(Seatno, certJSONasBytes) //rewrite the certificate
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- end transferCert (success)")
	return shim.Success(nil)
}
