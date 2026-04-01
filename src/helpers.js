export const checkString = (strVal, varName) => {
    // Throws if strVal is not a string or is empty. Returns the trimmed string.
    if (!strVal) throw `Error: You must supply a(n) ${varName}!`;
    if (typeof strVal !== "string") throw `Error: ${varName} must be a string!`;
    strVal = strVal.trim();
    if (strVal.length === 0) throw `Error: ${varName} cannot be an empty string or string with just spaces`;
    if (!isNaN(strVal)) throw `Error: ${strVal} is not a valid value for ${varName} as it only contains digits`;
    return strVal; // trimmed
};

export const checkNumber = (numVal, min, max, varName) => {
    // Throws if numVal is not a number or is outside of the range specified by min and max (both bounds are optional).
    // Converts numVal to a number and returns it.
    numVal = Number(numVal);
    if (typeof numVal !== "number" || Number.isNaN(numVal)) throw `Error: ${varName} must be a number!`;
    if (typeof min !== "undefined") {
        if (numVal < min) throw `Error: ${varName} must be at least ${min}`;
    }
    if (typeof max !== "undefined") {
        if (numVal > max) throw `Error: ${varName} must be at most ${max}`;
    }
    
    return numVal;
};
