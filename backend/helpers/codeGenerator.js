import Counter from '../models/Counter.js';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getCurrentMaxSequence(model, field, prefix) {
  const regex = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  const docs = await model.find({ [field]: { $regex: regex } }).select(field).lean();

  return docs.reduce((max, doc) => {
    const match = String(doc[field] || '').match(regex);
    const value = match ? Number(match[1]) : 0;
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
}

export async function generateSequentialCode({ key, prefix, model, field = 'code', width = 3 }) {
  const counterKey = `${key}:${prefix}`;
  let counter = await Counter.findOne({ key: counterKey });

  if (!counter) {
    const currentMax = await getCurrentMaxSequence(model, field, prefix);
    try {
      counter = await Counter.create({ key: counterKey, seq: currentMax });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const next = await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    const code = `${prefix}-${String(next.seq).padStart(width, '0')}`;
    const exists = await model.exists({ [field]: code });
    if (!exists) return code;
  }

  throw new Error(`Không thể sinh mã mới cho tiền tố ${prefix}`);
}
