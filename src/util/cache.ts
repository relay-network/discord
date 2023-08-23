export const SingleValueCache = {
  create: <T>(getter: () => Promise<T>, timeout: number) => {
    let cachedValue: T | undefined;
    let timer: NodeJS.Timeout | undefined;

    const get = async () => {
      if (cachedValue) {
        return cachedValue;
      }
      const r = await getter();
      cachedValue = r;
      timer = setTimeout(() => {
        cachedValue = undefined;
      }, timeout);
      return r;
    };

    const clear = () => {
      if (timer) {
        clearTimeout(timer);
      }
      cachedValue = undefined;
    };

    return { get, clear };
  },
};
