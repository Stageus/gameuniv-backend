class Exception {
  err;
  status;
  err;

  constructor(status, message, err = null) {
    this.message = message;
    this.status = status;
    this.err = err;
  }
}

class BadRequestException extends Exception {
  constructor(message, err = null) {
    super(400, message, err);
  }
}

class UnauthorizedException extends Exception {
  constructor(message, err = null) {
    super(401, message, err);
  }
}

class ForbiddenException extends Exception {
  constructor(message, err = null) {
    super(403, message, err);
  }
}

class NotFoundException extends Exception {
  constructor(message, err = null) {
    super(404, message, err);
  }
}

class ServerErrorException extends Exception {
  constructor(message, err = null) {
    super(409, message, err);
  }
}

module.exports = {
  Exception,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ServerErrorException,
};
