// ── KNOWLEDGE VS. GUESS DETECTION SCORING ENGINE ─────────────
/**
 * Composite guess_probability calculation (0.0 to 1.0) and label assignment.
 * Labels:
 * - "knowledge": Correct/solid understanding
 * - "guess": Low certainty / high guess probability
 * - "confident_wrong": Fast, high confidence answer that is INCORRECT (indicates misconception)
 * - "lucky_guess": Correct answer despite high guess indicators (uncertainty / low topic history)
 */
function scoreResponse({
  isCorrect,
  timeTakenMs,
  questionTimeLimitMs = 20000,
  studentTopicAvgTimeMs = 10000,
  answerSwitches = 0,
  confidenceRating = null,
  studentTopicAccuracy = 0.5
}) {
  const wTime = 0.35, wSwitch = 0.25, wConf = 0.25, wTopic = 0.15;

  // 1. Time signal: near time limit or far from student's own average = uncertain
  const timeLimitMs = Math.max(questionTimeLimitMs, 1000);
  const timeRatio = timeTakenMs / timeLimitMs;
  const avgTime = studentTopicAvgTimeMs || (timeLimitMs / 2);
  const timeZ = Math.abs(timeTakenMs - avgTime) / Math.max(avgTime, 1000);
  const timeSignal = Math.min(1.0, 0.5 * timeRatio + 0.5 * Math.min(timeZ, 1.0));

  // 2. Switch signal: choice flip-flopping
  const switchSignal = Math.min(1.0, (answerSwitches || 0) / 3.0);

  // 3. Confidence signal: 1=guessing .. 5=certain
  let confSignal = 0.5; // neutral when not provided
  if (confidenceRating !== null && confidenceRating !== undefined && confidenceRating >= 1 && confidenceRating <= 5) {
    confSignal = 1.0 - ((confidenceRating - 1) / 4.0);
  }

  // 4. Topic history signal: performance vs historical accuracy
  const topicSignal = Math.abs((isCorrect ? 1.0 : 0.0) - studentTopicAccuracy);

  const guessProbability = Math.round(
    (wTime * timeSignal + wSwitch * switchSignal + wConf * confSignal + wTopic * topicSignal) * 1000
  ) / 1000;

  let label = "knowledge";
  if (isCorrect && guessProbability >= 0.6) {
    label = "lucky_guess";
  } else if (!isCorrect && guessProbability < 0.35) {
    label = "confident_wrong";
  } else if (guessProbability >= 0.6) {
    label = "guess";
  } else {
    label = "knowledge";
  }

  return {
    isCorrect,
    guessProbability,
    label
  };
}

module.exports = { scoreResponse };
