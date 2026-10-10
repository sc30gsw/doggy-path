# doggy-path

An app that proposes dog-walking courses. It suggests a course that suits the dog, based on the Owner's and the dog's information and on how they are doing today.

Japanese UI labels are shown in parentheses where the app uses a fixed term.

## People and dogs

**Owner** (飼い主):
The person who uses the app and walks the dog. Has an account and exactly one Dog Profile.
_Avoid_: User, account

**Dog Profile**:
The Owner's record of their dog: name, Breed, Birth Month, sex, weight, and Dog Memo. One per Owner.
_Avoid_: Pet info, dog data

**Breed** (犬種):
The dog's breed, chosen from a fixed list, or "Mixed" (ミックス), or "Other" (その他) with free text.

**Birth Month**:
The year and month the dog was born. May be marked as estimated when the exact date is unknown. The dog's age is always derived from it.
_Avoid_: Age (as a stored value)

**Dog Memo** (犬メモ):
Free text in the Dog Profile about lasting facts: temperament, chronic illness, health tendencies.
_Avoid_: Notes, remarks (備考)

## Proposing a course

**Walk Course** (散歩コース):
A single loop that starts and ends at the Start Point. The unit the app proposes.
_Avoid_: Route, path

**Course Candidate**:
A Walk Course produced while building a proposal. Candidates are ranked against today's situation, and the best ones are shown to the Owner.
_Avoid_: Option, route candidate

**Course Conditions** (コース条件):
What the Owner enters when asking for a proposal: Mood, Today's Memo, Target Distance, Target Time, and Start Point. Every part may be left empty.
_Avoid_: Walk settings, search criteria

**Mood** (気分):
How the Owner (the human, not the dog) feels today, picked from a fixed set.
_Avoid_: Tension, vibe

**Today's Memo** (今日のメモ):
Free text in the Course Conditions about today only: weather, a diet, not having walked recently.
_Avoid_: Notes, remarks (備考)

**Target Distance** (目標距離):
The course length the Owner wants.

**Target Time** (目標時間):
How long the Owner wants the walk to take.

**Start Point** (開始地点):
Where a Walk Course begins and ends.
_Avoid_: Origin, departure point

**Default Point**:
A fixed place used as the Start Point when none is entered, current location is unavailable, and there is no previous Start Point.

**Condition Check**:
A judgment made before proposing, on whether the Course Conditions are consistent with each other and safe for the dog. A failed check produces a warning; the Owner may continue anyway.

**Walking Pace**:
How fast this dog typically walks: slow, normal, or brisk. Used to turn a Target Time into a distance.

**Body Fit**:
How well a Course Candidate suits the dog's body today, given its Dog Profile and Today's Memo.

**Mood Fit**:
How well a Course Candidate suits the Owner's Mood.
