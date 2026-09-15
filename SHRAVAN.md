**SHRAVAN**

**Smart Scan Strategy for Electronic Warfare**

SIH26055

# 1\. Executive Summary

SHRAVAN is an adaptive scan-scheduling prototype developed for SIH26055. It addresses the problem of deciding where a narrowband Electronic Support receiver should listen next when reliable prior emitter intelligence is unavailable. The prototype models a wide RF environment containing synthetic emitters while the receiver can observe one frequency band at a time. SHRAVAN learns from receiver observations, maintains a belief state, identifies temporal patterns, predicts future activity and dynamically selects the next high-value dwell.

The core operating loop is: RF Environment → Receiver → Detection → Hit/Miss → Belief Engine → Prediction Engine → Smart Scheduler → Next Dwell → Feedback.

# 2\. Problem Statement

A narrowband receiver cannot observe the complete RF spectrum simultaneously. Under a fixed frequency sweep, valuable dwell time may be spent on inactive bands, while intermittent or changing emitters may be missed because the receiver is listening elsewhere when the emitter appears.

The required capability is therefore an adaptive scan strategy that can operate without reliable prior intelligence, learn from observations, predict future opportunities, balance exploitation with exploration, and adapt when emitter behaviour changes.

# 3\. Objectives

- Reduce unproductive receiver dwell and improve interception opportunities.
- Learn emitter timing behaviour from past observations.
- Predict the next likely emitter opportunity when sufficient evidence exists.
- Continuously balance exploitation of known activity with exploration of uncertain bands.
- Detect when learned information becomes stale and adapt the scan policy.
- Provide an explainable reason for each scheduling decision.
- Evaluate SHRAVAN against conventional scheduling baselines under identical conditions.
- Provide a repeatable simulation and measurable performance metrics.

# 4\. Functional Requirements

## FR-01 — RF Environment Simulation

Maintain a seeded simulated RF environment containing frequency bands and synthetic emitters. Support Unknown/Cold Start, Periodic Emitter, Frequency Agile, Spatially Scanning, Multiple Emitters, Sudden Threat and Dynamic Environment scenarios.

## FR-02 — Narrowband Receiver

Model a receiver that listens to one frequency band at a time. Expose centre frequency, current band, instantaneous bandwidth, dwell duration, status, detection result and confidence.

## FR-03 — Detection

For every dwell, generate an observation such as Hit, Miss or False Alarm where applicable. The observation becomes input to the learning loop.

## FR-04 — Belief Engine

Maintain a belief state for each frequency band and update it from observed outcomes. Maintain relevant history including belief/confidence, hit/miss counts, observation timing and estimated periodicity.

## FR-05 — Temporal Pattern Learning

When repeated observations are available, estimate temporal rhythm or period from past observations without using future ground truth.

## FR-06 — Prediction Engine

Generate a predicted next emitter opportunity when sufficient historical observations exist. Expose predicted next event, estimated period and prediction confidence.

## FR-07 — Prediction Staleness and Adaptation

Reduce confidence in stale predictions. When emitter behaviour changes, support the cycle: confidence decay → exploration → new observation → updated belief → new prediction.

## FR-08 — Smart Scheduler

Score candidate bands using Predicted Activity, Recent Activity, Periodicity and Exploration, then select the next high-value dwell. Scheduler weights shall be configurable.

## FR-09 — Explainable Scheduling

Provide a human-readable 'Why This Band?' explanation reflecting only information available to the scheduler.

## FR-10 — Remember → Predict → Decide

Explicitly implement the closed loop in which observations are remembered, future opportunities are predicted, and the next dwell is decided. The new observation feeds back into the loop.

## FR-11 — Live Operations

Provide simulation status, scenario, mission time, controls, RF Activity Frequency × Time map, Current Receiver, Smart Scheduler, Emitter Track, Remember/Predict/Decide explanation, Belief State, Event Timeline and performance metrics.

## FR-12 — Scenario Lab

Allow selection and execution of the seven implemented scenarios for controlled evaluation.

## FR-13 — Strategy Benchmark

Compare Round Robin, Random, Greedy and SHRAVAN using the same scenario/environment, deterministic seed and receiver conditions. Report Probability of Detection, False Alarm Rate, Interception Rate, Average Intercept Time, Prediction Accuracy and Average Reward.

## FR-14 — Technical Inspector

Expose the simulated receiver model, detection model, scheduler weights, belief/prediction state, reward model and relevant detection statistics.

## FR-15 — Emitter Inspector

Expose emitter identifier, type, home band, period, duty cycle, learned/last detection belief and SHRAVAN predicted next event. Future ground truth is separated into Analyst View for validation.

## FR-16 — Ground-Truth Isolation

Receiver, belief engine, prediction engine and scheduler shall use only past/current observations. Future ground truth shall not be used for scheduling decisions.

## FR-17 — System Architecture

Provide the visual closed-loop architecture: RF Environment → Simulated Receiver → Detection → Hit/Miss → Belief Engine → Prediction Engine → Smart Scheduler → Next Dwell, including feedback to the belief engine.

## FR-18 — Event Timeline

Maintain a timeline of important detections and simulation events such as first contact, pattern detection, interception and adaptation events where generated.

## FR-19 — Performance Metrics

Calculate and display Probability of Detection, Interception Rate, Average Intercept Time and Prediction Accuracy, with False Alarm Rate and Reward available for benchmark evaluation.

# 5\. Non-Functional Requirements

## NFR-01 — Reproducibility

Scenario and benchmark runs shall use deterministic seeds for repeatable evaluation.

## NFR-02 — Explainability

Scheduler decisions shall be inspectable through contributing factors and the 'Why This Band?' explanation.

## NFR-03 — No Future Information Leakage

No decision-making component shall access future emitter ground truth.

## NFR-04 — Responsiveness

The dashboard shall update continuously during simulation without making the interface unusable.

## NFR-05 — Usability

Operationally important information shall remain easy to interpret: Current Receiver → Next Band → Why → Prediction → Intercept.

## NFR-06 — Modularity

Environment, receiver, detection, belief, prediction, scheduler, benchmark and UI shall remain logically separated.

## NFR-07 — Extensibility

Additional emitter behaviours and scenarios should be addable without rewriting the core scheduling loop.

## NFR-08 — Evaluation Integrity

Baseline policies shall be evaluated under identical environment and receiver conditions.

## NFR-09 — Technical Transparency

The prototype shall clearly identify simulated receiver behaviour and shall not claim physical RF fidelity.

## NFR-10 — Edge Handling

The system shall handle cold start, insufficient pattern history, misses, stale predictions, changing behaviour and multiple emitter opportunities.

# 6\. Input-to-Output Flow

**INPUT:** Scenario configuration + RF environment + emitter activity + receiver constraints

**1\. RECEIVER:** Select and observe one frequency-band dwell.

**2\. DETECTION:** Generate Hit / Miss / False Alarm observation.

**3\. REMEMBER:** Update belief, observation history, hit/miss information and timing history.

**4\. PREDICT:** Estimate period, confidence and next event when sufficient history exists; reduce confidence when information becomes stale.

**5\. DECIDE:** Score candidate bands using Predicted Activity + Recent Activity + Periodicity + Exploration.

**6\. NEXT DWELL:** Select the highest-value frequency band.

**7\. FEEDBACK:** Feed the new receiver observation back into the Belief Engine.

**OUTPUT:** Next frequency, decision explanation, updated belief, prediction, detection/interception events and performance metrics.

# 7\. Core Decision Logic

At every dwell, SHRAVAN follows the following sequence:

- Observe current band.
- Generate Hit / Miss / False Alarm.
- Update belief and observation history.
- Update temporal pattern information.
- Generate or refresh prediction.
- Calculate candidate-band scores.
- Balance exploitation and exploration.
- Select the highest-value band.
- Perform the next dwell.
- Repeat using the new observation.

Critical constraint: the scheduler uses past observations and current belief only; it does not use future ground truth.

# 8\. Prototype Demonstration Flow

The next-round demonstration should focus on proving the adaptive closed loop rather than presenting the prototype as a static dashboard.

- Start with Unknown / Cold Start to demonstrate operation without prior intelligence.
- Show exploration and changing belief across frequency bands.
- Show first contact and accumulation of observations.
- Show Pattern Detection and the emergence of an estimated period.
- Show Prediction of the next opportunity.
- Show Smart Scheduler prioritising a useful revisit.
- Show successful interception and the Event Timeline update.
- Move to Frequency Agile or Dynamic Environment.
- Show prediction confidence becoming unreliable as emitter behaviour changes.
- Show renewed exploration, new detection and updated prediction.
- Finish with Strategy Benchmark and technical inspection.

# 9\. Evaluation and Benchmarking

The Strategy Benchmark compares Round Robin, Random, Greedy and SHRAVAN under the same scenario, deterministic seed and receiver conditions. This isolates the effect of the scheduling policy and provides a fair basis for comparison.

Primary evaluation metrics:

- Probability of Detection
- False Alarm Rate
- Interception Rate
- Average Intercept Time
- Prediction Accuracy
- Average Reward

# 10\. System Architecture

RF Environment

↓

Simulated Receiver

↓

Detection

↓

Hit / Miss

↓

Belief Engine

↓

Prediction Engine

↓

Smart Scheduler

↓

Next Dwell

↓

Feedback: Receiver Observation → Belief Engine

This feedback closes the decision loop. The next scheduling decision is therefore based on the latest accumulated information rather than a fixed scan sequence.

# 11\. Current Prototype Scope and Next-Round Direction

Current prototype: a seeded synthetic RF simulation and web-based operational console demonstrating adaptive scan scheduling, belief updating, temporal prediction, explainable scheduling, scenario testing and baseline benchmarking.

Next-round direction: strengthen the validation of the scheduling strategy across scenarios, make the learning/adaptation behaviour clearly observable, maintain strict ground-truth isolation, and prepare the decision layer for eventual hardware-in-the-loop or SDR integration.

The prototype is intended to validate the scan-decision layer; it does not claim to be a physically faithful RF receiver implementation.

# 12\. Success Criteria

- SHRAVAN starts without reliable prior emitter intelligence.
- The receiver observes one narrow frequency slice at a time.
- Past observations update per-band belief.
- Repeated observations can produce an estimated temporal pattern.
- The prediction engine generates a future opportunity from learned history.
- The scheduler combines prediction, recent activity, periodicity and exploration.
- The system adapts when emitter behaviour changes or learned information becomes stale.
- Scheduling decisions remain explainable.
- Baseline policies can be compared under identical conditions.
- Performance is measured using objective metrics.
- The complete process is demonstrable as a closed feedback loop.

# 13\. Key Differentiator

**Traditional approach:** follow a predefined frequency scan and wait for the receiver to coincide with emitter activity.

**SHRAVAN:** learn from observations, estimate when activity is likely to return, schedule an intelligent revisit, and retain exploration so that unknown or changing activity can still be discovered.

**OBSERVE → REMEMBER → PREDICT → DECIDE → ADAPT**