const A_PRECISION = BigInt(1000000)

export function getD(tokenAmounts: Array<number>, amplificationFactor: number) : [number, number] {
    let N_COINS = tokenAmounts.length
    let S = BigInt(0)
    let Dprev = BigInt(0)

    for (var _x of Array.from(tokenAmounts)) {
        S += BigInt(_x)
    }
    if (S == BigInt(0)) {
        return [0, 0]
    }

    let D = S
    let Ann = BigInt(amplificationFactor * Math.pow(N_COINS, N_COINS))

    for (var _i = 0; _i < 255; _i++) {
        var D_P = D
        for (var _x of Array.from(tokenAmounts)) {
            D_P = D_P * D / (BigInt(_x) * BigInt(N_COINS))
        }
        Dprev = D
        D = (
            (Ann * S / A_PRECISION + D_P * BigInt(N_COINS))
            * D
            / ((Ann - A_PRECISION) * D / A_PRECISION + BigInt(N_COINS + 1) * D_P)
        )
        if (D > Dprev) {
            if (D - Dprev <= BigInt(1)) {
                return [Number(D), _i]
            }
        } else {
            if (Dprev - D <= BigInt(1)) {
                return [Number(D), _i]
            }
        }
    }
}


export function getY(
    i: number, j: number, x: number, tokenAmounts: Array<number>, D: number, amplificationFactor: number
): [number, number]
{
    let N_COINS = tokenAmounts.length
    let Ann = BigInt(amplificationFactor * Math.pow(N_COINS, N_COINS))
    let c = BigInt(D)
    let S = BigInt(0)
    let _x = BigInt(0)
    let y_prev = BigInt(0)

    for (var _i = 0; _i < N_COINS; _i++) {
        if (_i == i) {
          _x = BigInt(x)
        } else if (_i != j) {
            _x = BigInt(tokenAmounts[_i])
        } else {
            continue
        }
        S += _x
        c = c * BigInt(D) / (BigInt(_x) * BigInt(N_COINS))
    }
    c = c * BigInt(D) * A_PRECISION / (Ann * BigInt(N_COINS))
    let b = S + BigInt(D) * A_PRECISION / Ann
    let y = BigInt(D)
    for (var _i = 0; _i < 255; _i++) {
        y_prev = y
        y = (y * y + c) / (BigInt(2) * y + b - BigInt(D))
        if (y > y_prev) {
            if (y - y_prev <= BigInt(1)) {
                return [Number(y), _i]
            }
        } else {
            if (y_prev - y <= BigInt(1)) {
                return [Number(y), _i]
            }
        }
    }
}