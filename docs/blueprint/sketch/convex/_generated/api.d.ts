/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * Blueprint note: hand-written to match `convex codegen` output for the blueprint's
 * modules (codegen needs a deployment). `bunx convex dev` regenerates it.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as courseBuilder_index from "../courseBuilder/index.js";
import type * as courseBuilder_internal_metrics from "../courseBuilder/internal/metrics.js";
import type * as courseBuilder_internal_ors from "../courseBuilder/internal/ors.js";
import type * as courseBuilder_internal_overpass from "../courseBuilder/internal/overpass.js";
import type * as domain_breeds from "../domain/breeds.js";
import type * as domain_courseConditions from "../domain/courseConditions.js";
import type * as domain_dogProfile from "../domain/dogProfile.js";
import type * as domain_proposal from "../domain/proposal.js";
import type * as domain_proposalView from "../domain/proposalView.js";
import type * as domain_ranking from "../domain/ranking.js";
import type * as domain_tuning from "../domain/tuning.js";
import type * as domain_walk from "../domain/walk.js";
import type * as http from "../http.js";
import type * as judge_index from "../judge/index.js";
import type * as judge_internal_jev from "../judge/internal/jev.js";
import type * as judge_internal_questions from "../judge/internal/questions.js";
import type * as model_owners from "../model/owners.js";
import type * as model_proposals from "../model/proposals.js";
import type * as owners from "../owners.js";
import type * as proposalRuns from "../proposalRuns.js";
import type * as proposals from "../proposals.js";

declare const fullApi: ApiFromModules<{
  "auth": typeof auth;
  "courseBuilder/index": typeof courseBuilder_index;
  "courseBuilder/internal/metrics": typeof courseBuilder_internal_metrics;
  "courseBuilder/internal/ors": typeof courseBuilder_internal_ors;
  "courseBuilder/internal/overpass": typeof courseBuilder_internal_overpass;
  "domain/breeds": typeof domain_breeds;
  "domain/courseConditions": typeof domain_courseConditions;
  "domain/dogProfile": typeof domain_dogProfile;
  "domain/proposal": typeof domain_proposal;
  "domain/proposalView": typeof domain_proposalView;
  "domain/ranking": typeof domain_ranking;
  "domain/tuning": typeof domain_tuning;
  "domain/walk": typeof domain_walk;
  "http": typeof http;
  "judge/index": typeof judge_index;
  "judge/internal/jev": typeof judge_internal_jev;
  "judge/internal/questions": typeof judge_internal_questions;
  "model/owners": typeof model_owners;
  "model/proposals": typeof model_proposals;
  "owners": typeof owners;
  "proposalRuns": typeof proposalRuns;
  "proposals": typeof proposals;
}>;

export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
