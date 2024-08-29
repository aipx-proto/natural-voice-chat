import type { ErrorRequestHandler, RequestHandler } from "express";

export const logError: ErrorRequestHandler = (err, req, res, next) => {
  console.log(`[ERR] ${req.method} ${req.path}`);
  next(err);
};

export const logRoute: RequestHandler = (req, res, next) => {
  console.log(`[${res.statusCode}] ${req.method} ${req.path}`);
  next();
};
