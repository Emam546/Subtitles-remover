import sys
import json
import cv2
import numpy as np
import base64
from typing import Tuple, Iterable


def base64_to_image(b64_string: str) -> np.ndarray:
    """Decode base64 image to a NumPy array."""
    img_data = base64.b64decode(b64_string)
    np_arr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)


def image_to_base64(image: np.ndarray) -> str:
    """Encode a NumPy array to a base64 string."""
    _, buffer = cv2.imencode(".png", image)
    return base64.b64encode(buffer).decode("utf-8")


def process_image(image: np.ndarray, roi: Tuple[int, int, int, int], size=3,
                  color_range: Iterable = ((200, 200, 200), (255, 255, 255)),
                  radius: int = 2, flags=cv2.INPAINT_TELEA) -> np.ndarray:
    """Apply inpainting to the specified region."""
    x, y, w, h = roi
    kernel = np.ones((size, size), np.uint8)

    cropped_img = image[y:y+h, x:x+w]
    mask = cv2.inRange(cropped_img, *color_range)
    opening = cv2.dilate(mask, kernel)
    cropped_img = cv2.inpaint(cropped_img, opening, radius, flags)
    image[y:y+h, x:x+w] = cropped_img
    return image


def main():
    """Continuously read JSON input from stdin, process image, and write JSON output to stdout."""
    while True:
        try:
            # Read JSON input line from stdin
            input_data = sys.stdin.readline().strip()
            if not input_data:
                continue

            data = json.loads(input_data)

            # Decode image
            image = base64_to_image(data["image"])
            roi = tuple(data["roi"])
            size = data.get("size", 3)
            color_range = tuple(
                map(tuple, data.get("color_range", [[200, 200, 200], [255, 255, 255]])))
            radius = data.get("radius", 2)
            flags = data.get("flags", cv2.INPAINT_TELEA)

            # Process image
            processed_image = process_image(
                image, roi, size, color_range, radius, flags)

            # Encode and output result
            print(image_to_base64(processed_image))
            sys.stdout.flush()

        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.stdout.flush()


if __name__ == "__main__":
    main()
