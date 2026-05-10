import {checkString, checkNumber} from "../../helpers.js";

export const checkEmail = (email) => {
    // Throws if email has an invalid format. Firebase will further check if the domain is valid.
    // Returns the trimmed email.
    email = checkString(email, "email");
    if (!/^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]+)$/.test(email)) throw "Error: invalid email format";
    return email;
}

export const checkPassword = (password) => {
    // Throws if the password has an invalid format. Returns the trimmed password.
    password = checkString(password, "password");
    if (password.length < 8 || password.length > 32 ||
        /[\s]/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[!-\/:-@[-`{-~]/.test(password)) throw "Error: password must contain 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character and no spaces";
    return password;
}

export const checkUsername = (username) => {
    // Throws if username has an invalid format. Returns the trimmed username.
    username = checkString(username, "username");
    if (/^\d+$/.test(username)) throw "Error: username cannot consist of only numbers";
    if (username.length < 6 || username.length > 30) throw "Error: username must be between 6 and 30 characters long";
    return username;
}

export const setFBError = (e, setError) => {
    // Input: An FB error object or its message, and a setError function. Sets the error message to a more readable format.
    try {
        if (typeof e !== "string") e = e.message;
        e = e.trim();
        e = e.split("(auth/")[1];
        e = e.split(")")[0];
        e = e.replaceAll("-", " ");
        e = `Error: ${e.charAt(0).toUpperCase()}${e.slice(1)}.`;
    } catch (er) {
        e = er;
    }
    setError(e);
}