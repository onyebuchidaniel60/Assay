pragma circom 2.0.0;

// Self-contained fixed predicate for Assay's maximum leverage covenant:
//   debt * 10000 <= adjustedEbitda * thresholdBps
// Inputs are integer minor units supplied by the server-side snapshot.
// Private: debt, adjustedEbitda. Public: thresholdBps, compliant.

template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1 = 0;
    for (var i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] - 1) === 0;
        lc1 += out[i] * (1 << i);
    }
    lc1 === in;
}

template LessEqThan(n) {
    signal input in[2];
    signal output out;
    component n2b = Num2Bits(n + 1);
    n2b.in <== in[1] - in[0];
    out <== 1 - n2b.out[n];
}

template LeveragePredicate() {
    signal input debt;
    signal input adjustedEbitda;
    signal input thresholdBps;
    signal output compliant;

    // Range checks keep the witness inside 64-bit and 32-bit bounds.
    component debtBits = Num2Bits(64);
    debtBits.in <== debt;
    component ebitdaBits = Num2Bits(64);
    ebitdaBits.in <== adjustedEbitda;
    component thresholdBits = Num2Bits(32);
    thresholdBits.in <== thresholdBps;

    // Products fit safely in 96 bits for the bounded inputs.
    component comparison = LessEqThan(96);
    comparison.in[0] <== debt * 10000;
    comparison.in[1] <== adjustedEbitda * thresholdBps;
    compliant <== comparison.out;
}

component main {public [thresholdBps]} = LeveragePredicate();
