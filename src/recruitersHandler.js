// Global import
const express = require('express');
const Boom = require('boom');
const Joi = require('joi');
const { ObjectID } = require('mongodb');

// costum import
const { log } = require('./logs');
const { getDbHandle } = require('./database');
const { dbName, recruitersInfoSchema } = require('./objectStructure');


const router = express.Router();
let db = getDbHandle();

let { recruiters } = dbName;
// middleware that is specific to this router
router.use((req, res, next) => {
  db = (db === undefined) ? getDbHandle() : db;
  recruiters = (process.env.DBRECRU) ? process.env.DBRECRU : recruiters; // Variable name for testing the DB.
  log.info({ fnct: 'Job request' }, 'Request for the Job');
  next();
});

router.get('/', (req, res) => {
  db.collection(recruiters).find({ email: req.user.email }).toArray((err, results) => {
    if (err) { return log.warn({ fnct: 'View Database', error: err }, 'Prob in VIew DB'); }
    return res.json(results);
  });
});
router.post('/', (req, res, next) => {
  const bodyData = req.body;
  if (!bodyData || Object.keys(bodyData).length === 0) { return next(Boom.badRequest('Missing data')); }
  bodyData.email = req.user.email;
  return Joi.validate(bodyData, recruitersInfoSchema)
    .then(() => db.collection(recruiters).save(bodyData, (err) => {
      if (err) return log.warn({ fnct: 'Push New Recruiters', error: err }, 'Error in the POST');
      log.info({ fnct: 'Push recruiters' }, 'saved to database');
      return res.json({ status: 'Saved to database' });
    }))
    .catch(err => next(Boom.badRequest('Wrong Data Structure', err)));
});
router.put('/', (req, res, next) => {
  const { _id } = req.body;
  if (!_id) { return next(Boom.badRequest('Missing data')); }
  const tmp = { ...req.body, _id: ObjectID(_id), email: req.user.email };
  // I cannot use tmp because it complain about _id that it need to be a string.
  return Joi.validate({ ...req.body, email: tmp.email }, recruitersInfoSchema)
    .then(() => db.collection(recruiters).findOneAndUpdate({ _id: ObjectID(_id) }, tmp, (err) => {
      if (err) {
        log.warn({ fnct: 'Put Old Recruiters', error: err }, 'Error in the POST');
        return next(Boom.teapot('DB cannot make coffee', err));
      }
      log.info({ fnct: 'Push recruiters' }, 'saved to database');
      return res.json({ status: 'Saved to database' });
    }))
    .catch(err => next(Boom.badRequest('Wrong Data Structure', err)));
});
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  return db.collection(recruiters).remove({ _id: ObjectID(id) }, { w: 1 }, (err, data) => {
    if (err) return log.warn({ fnct: 'Delete Recruiters', error: err }, 'Error in the Delete');
    return res.json(data);
  });
});
router.delete('/', (req, res, next) => {
  if (process.env.NODE_ENV !== 'test') { return next(Boom.badRequest('Not in Test mode')); }
  return db.collection(recruiters).remove(null, null, (err, data) => {
    if (err) return log.warn({ fnct: 'Delete Recruiters', error: err }, 'Error in the Delete');
    return res.json(data);
  });
});

module.exports = router;
