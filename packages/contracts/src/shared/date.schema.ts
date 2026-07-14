import { z } from "zod";

export const IsoDateCodec = z.codec(
  z.iso.datetime(),
  z.date(),
  {
    decode: (s) => new Date(s),
    encode: (d) => d.toISOString(),
  },
);
