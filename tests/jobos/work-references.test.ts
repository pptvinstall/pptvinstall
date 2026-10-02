import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ECONOMICS_CONFIG } from "../../shared/pricing";
import { heuristicIntake, intakeToScopeDraft } from "../../shared/jobos/intake";
import { parseWorkText } from "../../shared/jobos/workIntake";

const W = DEFAULT_ECONOMICS_CONFIG.work;
const work = (message: string) => parseWorkText(message, W).map((p) => `${p.action}:${p.category}x${p.quantity}`);

test("mount ownership and the outlet behind a TV do not add another TV installation", () => {
  const message = "Mount my 65 inch TV on drywall. I have a mount and the outlet is behind the TV.";
  assert.deepEqual(work(message), ["mount:tvx1"]);
  const intake = heuristicIntake(message, W);
  assert.equal(intake.tvs.length, 1);
  assert.equal(intake.tvs[0]!.inches.value, 65);
  assert.equal(intake.tvs[0]!.wall.value, "drywall");
  assert.equal(intake.tvs[0]!.mountSource.value, "customer");
  assert.equal(intake.tvs[0]!.power.value, "existing");
  assert.equal(intakeToScopeDraft(intake, "heuristic", W).scope.tvs!.length, 1);
});

test("TV references remain references without sentence punctuation", () => {
  assert.deepEqual(work("Mount my 65 inch TV on drywall, I have a mount and the outlet is behind the TV"), ["mount:tvx1"]);
  assert.deepEqual(work("Mount a floating shelf under the TV"), ["mount:shelfx1"]);
});

test("explicit TV quantities and distinct TV nouns are preserved", () => {
  assert.deepEqual(work("Mount two TVs. I have a mount and outlets behind the TVs."), ["mount:tvx2"]);
  assert.equal(heuristicIntake("Mount two TVs. I have a mount and outlets behind the TVs.", W).tvs.length, 2);
  assert.deepEqual(work("Mount a 65 inch TV and a 55 inch TV."), ["mount:tvx1", "mount:tvx1"]);
  assert.equal(heuristicIntake("Mount a 65 inch TV and a 55 inch TV.", W).tvs.length, 2);
});

test("separate mount clauses and mixed TV actions keep their own scopes", () => {
  assert.deepEqual(work("Mount a TV in the living room. Mount a TV in the bedroom."), ["mount:tvx1", "mount:tvx1"]);
  assert.deepEqual(work("Take down four TVs, then mount two TVs at the new house."), ["unmount:tvx4", "mount:tvx2"]);
  assert.deepEqual(work("Mount two TVs and remove one TV."), ["mount:tvx2", "remove:tvx1"]);
});
