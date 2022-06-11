import { stringifyQuery } from "../auth"

it.each([
    [
        {
            code: "code",
            timestamp: "timestamp",
            state: "state",
            shop: "shop",
            host: "host",
            hmac: "hmac",
        },
        "code=code&hmac=hmac&host=host&shop=shop&state=state&timestamp=timestamp",
    ],
    [
        {
            code: "code",
            timestamp: "timestamp",
            state: "state",
            shop: "shop",
        },
        "code=code&shop=shop&state=state&timestamp=timestamp",
    ],
    [
        {
            hmac: "hmac",
            timestamp: "timestamp",
            state: "state",
            code: "code",
            host: "host",
            shop: "shop",
        },
        "code=code&hmac=hmac&host=host&shop=shop&state=state&timestamp=timestamp",
    ],
])("stringifyQuery(%p)", (input, expected) => {
    expect(stringifyQuery(input)).toBe(expected)
})
