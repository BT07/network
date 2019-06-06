package main

import (
	"encoding/json"
	"testing"

	"github.com/hyperledger/fabric/core/chaincode/shim"
)

var testLog = shim.NewLogger("one_test")

//==================================================================
// TestFeatureCreation - Test the 'CreateFeature' function
// =================================================================
func TestFeatureCreation(t *testing.T) {
	simpleChaincode := new(SimpleChaincode)
	simpleChaincode.testMode = true
	mockStub := shim.NewMockStub("Test Feature Creation", simpleChaincode)

	var functionAndArgs []string
	functionName := aadStudent

	// Invoke 'CreateFeature'
	featureId := NewFeatureId
	featureName := NewFeatureName

	args := []string{featureId, featureName}
	functionAndArgs = append(functionAndArgs, functionName)
	functionAndArgs = append(functionAndArgs, args...)

	checkInvoke(t, mockStub, functionAndArgs)

	feature := &a.Feature{FeatureId: featureId, Name: featureName}
	featureAsBytes, _ := json.Marshal(feature)

	checkState(t, mockStub, featureId, string(featureAsBytes))

	expectedResponse := "{\"FeatureId\":\"" + featureId + "\",\"Name\":\"" + featureName + "\",\"FeatureComposition\":null}"
	checkQueryOneArg(t, mockStub, "GetFeature", featureId, expectedResponse)
}
