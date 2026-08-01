const isMasterAdmin = (user) => Boolean(user?.admin && user.adminRole !== 'admin');

const withoutFields = (document, fields) => {
  const object = typeof document?.toObject === 'function'
    ? document.toObject()
    : { ...document };
  fields.forEach((field) => delete object[field]);
  return object;
};

const sanitizeUserForAdmin = (user, requester) => {
  const object = withoutFields(user, ['senha', 'resetToken', 'resetTokenExpires']);
  if (!isMasterAdmin(requester)) delete object.creditos;
  if (object.admin && !object.adminRole) object.adminRole = 'master';
  if (!object.admin) object.adminRole = null;
  return object;
};

const sanitizeBookingForAdmin = (booking, requester) => (
  isMasterAdmin(requester)
    ? booking
    : withoutFields(booking, ['total', 'payment', 'paymentId', 'creditosAplicados', 'creditosEstornados'])
);

const sanitizeRegistrationForAdmin = (registration, requester) => (
  isMasterAdmin(requester)
    ? registration
    : withoutFields(registration, ['preco', 'precoDupla', 'valorTotal', 'paymentId', 'creditosAplicados', 'creditosEstornados'])
);

module.exports = {
  isMasterAdmin,
  sanitizeUserForAdmin,
  sanitizeBookingForAdmin,
  sanitizeRegistrationForAdmin,
};
