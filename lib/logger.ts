import pino from "pino";
import PinoPretty from "pino-pretty";

const MAX_DEPTH = 3;

function truncateDepth (value: any, depth: number = 0): any
{
  if (depth > MAX_DEPTH)
  {
    return "[Object truncated]";
  }

  if (Array.isArray(value))
  {
    return value.map(item => truncateDepth(item, depth + 1));
  }

  if (value && typeof value === "object")
  {
    const truncatedObj: any = {};
    for (const key in value)
    {
      truncatedObj[key] = truncateDepth(value[key], depth + 1);
    }
    return truncatedObj;
  }

  return value;
}


const stream = PinoPretty({
  colorize: true,
  hideObject: Boolean(process.env.SIMPLE_LOG) || true,
  translateTime: "SYS:standard",
  ignore: "pid,hostname",
  customPrettifiers: {
    time: (time) => `${new Date(typeof time === "string" || typeof time === "number" ? time : Date.now()).toLocaleString()}`,
  },
});

const logger = pino(
  {
    hooks: {
      logMethod (args, method)
      {
        if (args.length > 1 && typeof args[0] === "object")
        {
          args[0] = truncateDepth(args[0]);
        }
        return method.apply(this, args);
      },
    },
  },
  stream
);


export default logger;