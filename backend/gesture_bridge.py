from __future__ import annotations

import asyncio
import json
import math
import time

import cv2
import mediapipe as mp
import websockets


WS_URL = "ws://127.0.0.1:8000/ws/gestures"
SEND_INTERVAL_SECONDS = 1 / 20
PINCH_THRESHOLD = 0.055
TAP_COOLDOWN_SECONDS = 0.45

mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def dist(a, b) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


def finger_open(tip, pip) -> bool:
    return tip.y < pip.y


def classify_gesture(hand_landmarks, hand_label: str, frame_width: int, frame_height: int) -> dict[str, object]:
    lm = hand_landmarks.landmark
    thumb_tip = lm[4]
    index_tip = lm[8]
    middle_tip = lm[12]
    ring_tip = lm[16]
    pinky_tip = lm[20]
    index_pip = lm[6]
    middle_pip = lm[10]
    ring_pip = lm[14]
    pinky_pip = lm[18]
    wrist = lm[0]
    middle_mcp = lm[9]

    open_count = sum(
        (
            finger_open(index_tip, index_pip),
            finger_open(middle_tip, middle_pip),
            finger_open(ring_tip, ring_pip),
            finger_open(pinky_tip, pinky_pip),
        )
    )
    pinch_distance = dist(thumb_tip, index_tip)
    palm_span = max(dist(wrist, middle_mcp), 0.001)
    normalized_pinch = pinch_distance / palm_span

    rotation_x = clamp((middle_mcp.y - wrist.y) * 3.2, -1.0, 1.0)
    rotation_y = clamp((index_tip.x - wrist.x) * 4.0, -1.0, 1.0)
    depth = clamp((0.22 - palm_span) * 6.5, -1.0, 1.0)
    strength = clamp(open_count / 4, 0.0, 1.0)
    pointer = [clamp(index_tip.x, 0.0, 1.0), clamp(index_tip.y, 0.0, 1.0)]

    gesture_type = "open_palm"
    zoom_delta = 0.0
    layer_spread = 0.0
    pulse_route = None

    if normalized_pinch < PINCH_THRESHOLD:
        gesture_type = "pinch"
        zoom_delta = clamp((PINCH_THRESHOLD - normalized_pinch) * 18, -1.0, 1.0)
        strength = clamp(1.0 - normalized_pinch / PINCH_THRESHOLD, 0.0, 1.0)
    elif open_count <= 1:
        gesture_type = "fist"
        strength = clamp(1.0 - open_count * 0.25, 0.0, 1.0)
        pulse_route = "cortex-thalamus-brainstem"
    elif open_count >= 4:
        gesture_type = "open_palm"
    elif finger_open(index_tip, index_pip) and open_count <= 2:
        gesture_type = "point"
        strength = 0.92

    return {
        "source": "mediapipe-webcam",
        "timestamp": time.time(),
        "gesture": {
            "type": gesture_type,
            "handedness": hand_label.lower(),
            "rotation": [rotation_x, rotation_y],
            "zoomDelta": zoom_delta,
            "pointer": pointer,
            "depth": depth,
            "strength": strength,
            "regionHint": None,
            "layerSpread": layer_spread,
            "pulseRoute": pulse_route,
        },
        "debug": {
            "palm_span_px": palm_span * max(frame_width, frame_height),
            "pinch_distance": normalized_pinch,
        },
    }


async def publish_loop() -> None:
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    last_send = 0.0
    last_tap = 0.0

    with mp_hands.Hands(
        model_complexity=1,
        max_num_hands=2,
        min_detection_confidence=0.6,
        min_tracking_confidence=0.6,
    ) as hands:
        async with websockets.connect(WS_URL, ping_interval=20, ping_timeout=20) as ws:
            while cap.isOpened():
                ok, frame = cap.read()
                if not ok:
                    await asyncio.sleep(0.02)
                    continue

                frame = cv2.flip(frame, 1)
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = hands.process(rgb)
                payload = None

                if result.multi_hand_landmarks and result.multi_handedness:
                    hand_count = len(result.multi_hand_landmarks)
                    if hand_count == 2:
                        centers = []
                        for hand_landmarks in result.multi_hand_landmarks:
                            lm = hand_landmarks.landmark
                            centers.append(((lm[0].x + lm[9].x) * 0.5, (lm[0].y + lm[9].y) * 0.5))
                        spread = math.hypot(centers[0][0] - centers[1][0], centers[0][1] - centers[1][1])
                        payload = {
                            "source": "mediapipe-webcam",
                            "timestamp": time.time(),
                            "gesture": {
                                "type": "two_hand_expand",
                                "handedness": "both",
                                "rotation": [0.0, 0.0],
                                "zoomDelta": 0.0,
                                "pointer": [0.5, 0.5],
                                "depth": 0.0,
                                "strength": clamp(spread * 1.6, 0.0, 1.0),
                                "regionHint": None,
                                "layerSpread": clamp(spread * 1.8, 0.0, 1.0),
                                "pulseRoute": None,
                            },
                        }
                    else:
                        hand_landmarks = result.multi_hand_landmarks[0]
                        hand_label = result.multi_handedness[0].classification[0].label
                        payload = classify_gesture(hand_landmarks, hand_label, frame.shape[1], frame.shape[0])

                        if payload["gesture"]["type"] == "point" and payload["gesture"]["strength"] > 0.9:
                            now = time.time()
                            if now - last_tap > TAP_COOLDOWN_SECONDS:
                                tap_payload = json.loads(json.dumps(payload))
                                tap_payload["gesture"]["type"] = "air_tap"
                                tap_payload["timestamp"] = now
                                await ws.send(json.dumps(tap_payload))
                                last_tap = now

                    for hand_landmarks in result.multi_hand_landmarks:
                        mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

                now = time.time()
                if payload and now - last_send >= SEND_INTERVAL_SECONDS:
                    await ws.send(json.dumps(payload))
                    last_send = now

                if payload:
                    gesture_name = payload["gesture"]["type"]
                    cv2.putText(frame, f"gesture: {gesture_name}", (24, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (90, 240, 255), 2)

                cv2.imshow("DOD Gesture Bridge", frame)
                if cv2.waitKey(1) & 0xFF == 27:
                    break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    asyncio.run(publish_loop())
