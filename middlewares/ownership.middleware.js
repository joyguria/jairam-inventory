exports.checkOwnership = (paramName) => {
  return (req, res, next) => {
    const resourceId = req.params[paramName];

    if (req.user.role === "admin") return next();

    if (req.user._id.toString() !== resourceId) {
      return res.status(403).json({
        message: "Access Denied - Not your resource"
      });
    }

    next();
  };
};