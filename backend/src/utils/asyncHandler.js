const asyncHandler = (handler) => function wrappedAsyncHandler(req, res, next) {
  return Promise.resolve(handler(req, res, next)).catch(next);
};

module.exports = asyncHandler;
