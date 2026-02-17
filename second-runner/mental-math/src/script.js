// ASAP
// I added the division operation, but I need to validate it.

const numOneDiv = document.getElementById("number-one-div");
const operandDiv = document.getElementById("operand-div")
const numTwoDiv = document.getElementById("number-two-div");
const btn = document.getElementById("btn-random");
const resultInput = document.getElementById("result-input");

const operandList = ["+", "-", "*", "/"];

let numberOne = 0;
let operand = "";
let numberTwo = 0;
let result = 0;
let product = 0;

function getOperation() {

    // Defining a random operation and its result.
    numberOne = getRandomNumber(10); // Change the 10 to a difficulty seed
    operand = getRandomOperand();
    numberTwo = getRandomNumber(numberOne + 1); // Change the 10 to a difficulty seed, besides, not all operations need two numbers
    result = getResult(numberOne, numberTwo, operand);

    numOneDiv.textContent = numberOne;
    operandDiv.textContent = operand;
    numTwoDiv.textContent = numberTwo;

    resultInput.focus();

}

function getRandomNumber(max) {

    return Math.floor(Math.random() * max);

}

function getRandomOperand() {
    
    const seed = Math.floor(Math.random() * operandList.length);
    return operandList[seed];

}

function getResult(numOne, numTwo, operand) {

    // In the future, the function should generate the following operands:
    //  **
    //  sqrt
    //  These operations would be enough for a future version
    
    switch (operand) {

        case "+":
            return numOne + numTwo;
        
        case "-":
            return numOne - numTwo;

        case "*":
            return numOne * numTwo;

        case "/":
            product = numOne * numTwo;
            numberTwo = numberOne;
            numberOne = product;

            return numTwo;
        
        default:
            throw new Error("Unknown operand: " + operand);

    }

}

function handleInput(e) {

    e.target.value = e.target.value.replace(/\D/g, "");
    // This is validating that only digits 0 - 9 are typed
    // \D - any character that is not a digit
    // g - global flag, replace all matches, not just the first one

    // if (e.target.value === "") return; just in case of bugs. So far so good.

    const attempt = Number(resultInput.value);
    
    if (attempt === result) {
        getOperation();
        resultInput.value = "";
    }

}

getOperation();

btn.addEventListener("click", getOperation);
resultInput.addEventListener("input", handleInput);
