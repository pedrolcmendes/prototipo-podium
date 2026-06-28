const Settings = require('../models/Settings');

const getSettings = async (req, res) => {
  const s = await Settings.findById('global') || { cancelWindow: 24, maxAdvanceDays: 30 };
  res.json({ cancelWindow: s.cancelWindow, maxAdvanceDays: s.maxAdvanceDays });
};

const updateSettings = async (req, res) => {
  const { cancelWindow, maxAdvanceDays } = req.body;
  const update = {};
  if (cancelWindow !== undefined) update.cancelWindow = Number(cancelWindow);
  if (maxAdvanceDays !== undefined) update.maxAdvanceDays = Number(maxAdvanceDays);
  const s = await Settings.findByIdAndUpdate('global', update, { upsert: true, new: true });
  res.json({ cancelWindow: s.cancelWindow, maxAdvanceDays: s.maxAdvanceDays });
};

module.exports = { getSettings, updateSettings };
