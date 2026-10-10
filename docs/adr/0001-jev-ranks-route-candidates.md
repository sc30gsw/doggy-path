# Jev ranks Course Candidates; it does not build them

Jev (TypeSafe's System One model) returns typed judgments and probabilities and cannot generate geographic routes. So code builds several loop Course Candidates with a routing API, and Jev only scores each candidate against the Dog Profile and Course Conditions so code can rank them. We also considered having Jev pick a course "policy" and building a single route from it, and doing both; we chose ranking because selecting among candidates is what Jev is built for and it is the simplest shape to implement.
