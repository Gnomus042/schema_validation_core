class InvalidDataError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidDataError";
    }
}

class ShexValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ShexValidationError";
    }
}

module.exports = {
    InvalidDataError: InvalidDataError,
    ShexValidationError: ShexValidationError,

}