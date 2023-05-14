import { Controller, ControllerManager, Tag, Types } from '../src'

const controller = new Controller();

const testArray = controller.newTag('TestArray', null, false, Types.BIT_STRING)

// if(!testArray.value) testArray.value = false;

// testArray.value[0] = false;
// testArray.value[1] = true;

if(!testArray.value) testArray.value = [];

testArray.value[1] = false;

controller.writeTag(testArray);

console.log({testArray: testArray.value, bitIndex: testArray.bitIndex})