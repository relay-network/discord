export const nonEmpty = <TValue>(
  value: TValue | null | undefined
): value is TValue => value !== null && value !== undefined;

export const onlyUnique = <TValue>(
  value: TValue,
  index: number,
  array: TValue[]
) => {
  return array.indexOf(value) === index;
};
