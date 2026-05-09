/**
 * Mad Libs voting public API.
 */
export {
  MAD_LIB_VOTES_COLLECTION,
  buildVoteDocId,
  buildReservationVoterId,
  castVote,
  fetchOwnVotes,
  getOrCreateAnonVoterId,
  subscribeToMadLibVotes,
  tallyVotes,
  type FieldTally,
  type MadLibVote,
} from './madLibsApi';
