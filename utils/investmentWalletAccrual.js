const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round2 = (value) => Number(toNumber(value).toFixed(2));

const normalizeActivationTime = (value) => {
  const raw = String(value || '00:00').trim();
  const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return '00:00';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const toDateAtTime = (dateInput, time = '00:00') => {
  const base = new Date(dateInput);
  if (Number.isNaN(base.getTime())) return null;
  const [hh, mm] = normalizeActivationTime(time).split(':').map((item) => Number(item));
  base.setHours(hh, mm, 0, 0);
  return base;
};

const getEligiblePayoutDays = (share, asOf = new Date()) => {
  const startDate = share?.startDate;
  const endDate = share?.date || share?.endDate;
  const activationTime = normalizeActivationTime(share?.walletActivationTime);

  const firstPayoutAt = toDateAtTime(startDate, activationTime);
  const lastPayoutAt = toDateAtTime(endDate, activationTime);
  const now = new Date(asOf);

  if (!firstPayoutAt || !lastPayoutAt || Number.isNaN(now.getTime())) return 0;
  if (lastPayoutAt < firstPayoutAt) return 0;

  const cutoff = now < lastPayoutAt ? now : lastPayoutAt;
  if (cutoff < firstPayoutAt) return 0;

  return Math.floor((cutoff.getTime() - firstPayoutAt.getTime()) / MS_PER_DAY) + 1;
};

const getDailyProfitAmount = (share) => {
  return round2(toNumber(share?.dailyProfitAmount, toNumber(share?.profitAmount, 0)));
};

const buildAccrualPatch = (wallet, share, asOf = new Date()) => {
  const eligibleDays = getEligiblePayoutDays(share, asOf);
  const accruedDays = Math.max(0, Math.floor(toNumber(wallet?.accruedDays, 0)));
  const pendingDays = Math.max(0, eligibleDays - accruedDays);

  if (pendingDays <= 0) {
    return { changed: false, patch: {} };
  }

  const dailyProfit = getDailyProfitAmount(share);
  const creditAmount = round2(pendingDays * dailyProfit);
  const patch = {
    accruedDays: eligibleDays,
    lastAccruedAt: new Date(asOf),
  };

  if (creditAmount > 0) {
    patch.amount = round2(toNumber(wallet?.amount, 0) + creditAmount);
    patch.totalCreditedAmount = round2(toNumber(wallet?.totalCreditedAmount, 0) + creditAmount);
    if (String(wallet?.status || '') === 'pending_accept') {
      patch.status = 'accepted';
      patch.acceptedAt = new Date(asOf);
    }
  }

  return { changed: true, patch };
};

module.exports = {
  normalizeActivationTime,
  getDailyProfitAmount,
  buildAccrualPatch,
};
