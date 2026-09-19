export const MAX_SIGNALING_RECONNECT_ATTEMPTS = 3;
export const SIGNALING_RECONNECT_BASE_DELAY_MS = 1000;

export function nextSignalingReconnectDelay(attempt, baseDelay = SIGNALING_RECONNECT_BASE_DELAY_MS) {
  const normalizedAttempt = Math.max(1, Math.floor(attempt));
  return baseDelay * (2 ** (normalizedAttempt - 1));
}

export function isOfferCollision({ makingOffer, signalingState, isSettingRemoteAnswerPending }) {
  return makingOffer || (
    signalingState !== "stable" && !isSettingRemoteAnswerPending
  );
}

export function shouldIgnoreOffer({ polite, offerCollision }) {
  return !polite && offerCollision;
}
