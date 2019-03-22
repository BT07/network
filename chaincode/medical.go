package main

import (	
	"encoding/json"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
	"github.com/hyperledger/fabric/core/chaincode/lib/cid"
	"encoding/base64"
	"strings"
)

type SmartContract struct {
}

var logger = shim.NewLogger("patient_cc0")

type Patient struct {
	PatientId    	string `json:"patientId"`
	FirstName   	string `json:"firstName"`
	LastName  		string `json:"lastName"`
	DateOfBirth     string `json:"dateOfBirth"`
	CaseIds         []CaseIds  `json:"caseID"`
}

type CaseIds struct {
    Case_Id string `json:"caseID"`
}

const (
    CR    = "CASE_CREATED"
    AP   = "APPROVAL_PENDING"
    AA = "APPROVAL_ACCEPTED"
)

type CaseDetails struct {
	CaseId     				string `json:"caseId"`
	PatientId    			string `json:"patientId"`
	DateOfExamination   	string `json:"dateOfExamination"`
	MedicalReport      		string `json:"medicalReport"`
	CostOfService           string `json:"costOfService "`
	Status 					string `json:"status"`
}

func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
	return shim.Success(nil)
}

func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {

	// Retrieve the requested Smart Contract function and arguments
	function, args := APIstub.GetFunctionAndParameters()
	// Route to the appropriate handler function to interact with the ledger appropriately
	if function == "queryPatient" {
		return s.queryPatient(APIstub, args)
	} else if function == "createPatient" {
		return s.createPatient(APIstub, args)
	}else if function == "createCase" {
		return s.createCase(APIstub, args)
	}else if function == "queryCase" {
		return s.queryCase(APIstub, args)
	}else if function == "approveClaim" {
		return s.approveClaim(APIstub, args)
	}else if function == "submitClaim" {
		return s.submitClaim(APIstub, args)
	}

	return shim.Error("Invalid Smart Contract function name.")
}

func (s *SmartContract) createPatient(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 5 {
		return shim.Error("Incorrect number of arguments. Expecting 6")
	}
	
	patient := Patient{}
	patient.PatientId = args[0]
	patient.FirstName = args[1]
	patient.LastName = args[2]
	patient.DateOfBirth =  args[3]
	
	cases := CaseIds{}
	cases.Case_Id = args[4]
	
	patient.CaseIds = append(patient.CaseIds, cases)
	
	bytes, _ := json.Marshal(&patient)

	 APIstub.PutState(args[0], bytes)
	 
	 id, err := cid.GetID(APIstub)
	 if err == nil {

	   val := getUserId(id);
	   logger.Info("Initiated by : " + val)
	 }

	 mspid, err := cid.GetMSPID(APIstub)
	 if err == nil {
	   logger.Info("MSP ID of the initiator is : " + mspid)
	 }
	 
	 cert, err := cid.GetX509Certificate(APIstub)
	 if err != nil {
		logger.Info("Error getting certificate")
	 }
	 if err == nil {
		if cert != nil{
			logger.Info("Successfully got the certificate")
		}else if cert == nil {
			logger.Info("Entity does not use X509 certificate")
		}
		
	 }
	 
	return shim.Success(nil)
}

func (s *SmartContract) queryPatient(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	
	id, err := cid.GetID(APIstub)
	 if err == nil {
		val := getUserId(id);
		logger.Info("Initiated by : " + val)
	 }

	 mspid, err := cid.GetMSPID(APIstub)
	 if err == nil {
	   logger.Info("MSP ID of the initiator is : " + mspid)
	 }

	patientAsBytes, _ := APIstub.GetState(args[0])

	if err != nil {
		if len(patientAsBytes) == 0 { 
			return shim.Error("No Patient with id " + args[0])
		}
	}
	return shim.Success(patientAsBytes)
}

func (t *SmartContract) createCase(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	
	
	if len(args) != 5 {
		return shim.Error("Incorrect number of arguments. Expecting 5")
	}
	
	bytes, err := APIstub.GetState(args[1])
	if err != nil { 
		return shim.Error("No Patient with name " + args[1])
	}		
	
	valCasebytes, err := APIstub.GetState(args[0])
	var checkCase CaseDetails
	if err == nil { 
		if len(valCasebytes) == 0 {
			err = json.Unmarshal(valCasebytes,&checkCase)
			return shim.Error("Case already present : " +args[0])
		}
		
	}	
	
	caseDetail := CaseDetails{}
	caseDetail.CaseId = args[0]
	caseDetail.PatientId = args[1]
	caseDetail.DateOfExamination = args[2]
	caseDetail.MedicalReport =  args[3]
	caseDetail.CostOfService = args[4]
	caseDetail.Status = CR
	
	 case_bytes, err := json.Marshal(&caseDetail)

	 err = APIstub.PutState(args[0], case_bytes)
	 
	 if err != nil {
		return shim.Error("Error storing Case details") 
	}
	
	var patient Patient
	
	err = json.Unmarshal(bytes,&patient)
	
	cases := CaseIds{}
	cases.Case_Id = args[0]
	
	patient.CaseIds = append(patient.CaseIds, cases)
	
    bytes, err = json.Marshal(&patient)    
	
	if err != nil { 
		return shim.Error("Error converting Patient record") 
	}
	
	err = APIstub.PutState(args[1], bytes)
	
	if err != nil { 
		return shim.Error("Error storing Patient record") 
	}

	return shim.Success(nil)
}

func (s *SmartContract) queryCase(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	
	 id, err := cid.GetID(APIstub)
	 if err == nil {
		val := getUserId(id);
		logger.Info("Initiated by : " + val)
	 }

	 mspid, err := cid.GetMSPID(APIstub)
	 if err == nil {
	   logger.Info("MSP ID of the initiator is : " + mspid)
	 }

	 
	caseAsBytes, _ := APIstub.GetState(args[0])

	if err != nil {
		if len(caseAsBytes) == 0 { 
			return shim.Error("No Case with id " + args[0])
		}
	}
	return shim.Success(caseAsBytes)
}

func (t *SmartContract) submitClaim(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	
	bytes, err := APIstub.GetState(args[0])
	if err != nil {
		if len(bytes) == 0 { 
			return shim.Error("No Case with id " + args[0])
		}
	}
	
	var caseDet CaseDetails
	
	err = json.Unmarshal(bytes,&caseDet)
	
	caseDet.Status = AP

	bytes, err = json.Marshal(&caseDet) 
	
	if err != nil { 
		return shim.Error("Error converting Case record") 
	}
	
	err = APIstub.PutState(args[0], bytes)
	
	if err != nil { 
		return shim.Error("Error storing Case record") 
	}
	
	err = APIstub.SetEvent("submitClaim", bytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	
	return shim.Success(nil)
}

func (t *SmartContract) approveClaim(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	
	id, err := cid.GetID(APIstub)
	 if err == nil {
		val := getUserId(id);
		logger.Info("Initiated by : " + val)
	 }

	 mspid, err := cid.GetMSPID(APIstub)
	 if err == nil {
	   logger.Info("MSP ID of the initiator is : " + mspid)
	 }
	 
	bytes, err := APIstub.GetState(args[0])
	if err != nil { 
		if len(bytes) == 0 {
		return shim.Error("No Case with id " + args[0])
		}
	}
	
	var caseDet CaseDetails
	
	err = json.Unmarshal(bytes,&caseDet)
	
	caseDet.Status = AA

	bytes, err = json.Marshal(&caseDet) 
	
	if err != nil { 
		return shim.Error("Error converting Case record") 
	}
	
	err = APIstub.PutState(args[0], bytes)
	
	if err != nil { 
		return shim.Error("Error storing Case record") 
	}
	
	err = APIstub.SetEvent("approveClaim", bytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	
	return shim.Success(nil)
}

// extract user CN for getId call
func getUserId(userId string) string{
		   idDecoded, _ := base64.StdEncoding.DecodeString(userId)
		   idDecodedString := string(idDecoded[:])
	       logger.Info("Decode String : "+idDecodedString)
		   id1 := strings.Split(idDecodedString,",")
		   id2 := strings.Split(id1[0],"CN=")
		   return id2[1]
	} 

func main() {
	err := shim.Start(new(SmartContract))
	if err != nil {
		logger.Errorf("Error starting Simple chaincode: %s", err)
	}
}
