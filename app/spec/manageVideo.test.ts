import { isValidQueryProps } from "@app/main/utils/isValidProps";


test("test isValid output", () => {
  expect(
    isValidQueryProps({
      startTime: 0,
      roi: {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
      colorRange: {
        min: [0, 0, 0],
        max: [0, 0, 0],
      },
      size: 1,
    }),
  ).toBe(true);
  expect(
    isValidQueryProps({
      startTime: 0,
      roi: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      colorRange: {
        min: [0, 0],
        max: [0, 0, 0],
      },
      size: 1,
    }),
  ).toBe(false);
  expect(
    isValidQueryProps({
      startTime: 0,
      roi: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      colorRange: {
        min: [0, 0, 0],
        max: [0, 0, 0],
      },
    }),
  ).toBe(false);
});
