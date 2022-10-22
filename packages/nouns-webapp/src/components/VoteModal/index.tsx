import { Button, FloatingLabel, FormControl, Spinner } from 'react-bootstrap';
import classes from './VoteModal.module.css';
import { useCastVote, useCastVoteWithReason, Vote } from '../../wrappers/nounsDao';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { TransactionStatus } from '@usedapp/core';
import NavBarButton, { NavBarButtonStyle } from '../NavBarButton';
import clsx from 'clsx';
import { Trans } from '@lingui/macro';
import { i18n } from '@lingui/core';
import SolidColorBackgroundModal from '../SolidColorBackgroundModal';

interface VoteModalProps {
  show: boolean;
  onHide: () => void;
  proposalId: string | undefined;
  availableVotes: number;
}

const POST_SUCESSFUL_VOTE_MODAL_CLOSE_TIME_MS = 3000;

const VoteModal = ({ show, onHide, proposalId, availableVotes }: VoteModalProps) => {
  const { castVote, castVoteState } = useCastVote();
  const { castVoteWithReason, castVoteWithReasonState } = useCastVoteWithReason();
  const [vote, setVote] = useState<Vote>();
  const [voteReason, setVoteReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoteSucessful, setIsVoteSuccessful] = useState(false);
  const [isVoteFailed, setIsVoteFailed] = useState(false);
  const [failureCopy, setFailureCopy] = useState<ReactNode>('');
  const [errorMessage, setErrorMessage] = useState<ReactNode>('');

  const getVoteErrorMessage = (error: string | undefined) => {
    if (error?.match(/voter already voted/)) {
      return <Trans>User Already Voted</Trans>;
    }
    return error;
  };

  const handleVoteStateChange = useCallback((state: TransactionStatus) => {
    switch (state.status) {
      case 'None':
        setIsLoading(false);
        break;
      case 'Mining':
        setIsLoading(true);
        break;
      case 'Success':
        setIsLoading(false);
        setIsVoteSuccessful(true);
        break;
      case 'Fail':
        setFailureCopy(<Trans>Transaction Failed</Trans>);
        setErrorMessage(state?.errorMessage || <Trans>Please try again.</Trans>);
        setIsLoading(false);
        setIsVoteFailed(true);
        break;
      case 'Exception':
        setFailureCopy(<Trans>Error</Trans>);
        setErrorMessage(
          getVoteErrorMessage(state?.errorMessage) || <Trans>Please try again.</Trans>,
        );
        setIsLoading(false);
        setIsVoteFailed(true);
        break;
    }
  }, []);

  // Cast vote transaction state hook
  useEffect(() => {
    handleVoteStateChange(castVoteState);
  }, [castVoteState, handleVoteStateChange]);

  // Cast vote with reason transaction state hook
  useEffect(() => {
    handleVoteStateChange(castVoteWithReasonState);
  }, [castVoteWithReasonState, handleVoteStateChange]);

  // Auto close the modal after a transaction completes succesfully
  // Leave failed transaction up until user closes manually to allow for debugging
  useEffect(() => {
    if (isVoteSucessful) {
      setTimeout(onHide, POST_SUCESSFUL_VOTE_MODAL_CLOSE_TIME_MS);
    }
  }, [isVoteSucessful, onHide]);

  // If show is false (i.e. on hide) reset failure related state variables
  useEffect(() => {
    if (show) {
      return;
    }
    setIsVoteFailed(false);
  }, [show]);

  const voteModalContent = (
    <>
      <div className={classes.voteModalTitle}>
        <Trans>Vote on Prop {i18n.number(parseInt(proposalId || '0'))}</Trans>
      </div>
      <div className={classes.voteModalSubtitle}>
        {availableVotes === 1 ? (
          <Trans>
            Voting with <span className={classes.bold}>{i18n.number(availableVotes)}</span> Noun
          </Trans>
        ) : (
          <Trans>
            Voting with <span className={classes.bold}>{i18n.number(availableVotes)}</span> Nouns
          </Trans>
        )}
      </div>
      {isVoteSucessful && (
        <div className={classes.transactionStatus}>
          <p>
            <Trans>
              You've successfully voted on on prop {i18n.number(parseInt(proposalId || '0'))}
            </Trans>
          </p>

          <div className={classes.voteSuccessBody}>
            <Trans>Thank you for voting.</Trans>
          </div>
        </div>
      )}
      {isVoteFailed && (
        <div className={classes.transactionStatus}>
          <p className={classes.voteFailureTitle}>
            <Trans>There was an error voting for your account.</Trans>
          </p>
          <div className={classes.voteFailureBody}>
            {failureCopy}: <span className={classes.voteFailureErrorMessage}>{errorMessage}</span>
          </div>
        </div>
      )}
      {!isVoteFailed && !isVoteSucessful && (
        <div className={clsx(classes.votingButtonsWrapper, isLoading ? classes.disabled : '')}>
          <div onClick={() => setVote(Vote.FOR)}>
            <NavBarButton
              buttonText={<Trans>For</Trans>}
              buttonIcon={<></>}
              buttonStyle={NavBarButtonStyle.FOR_VOTE_SUBMIT}
              className={
                vote === Vote.FOR ? '' : vote === undefined ? classes.inactive : classes.unselected
              }
            />
          </div>
          <br />
          <div onClick={() => setVote(Vote.AGAINST)}>
            <NavBarButton
              buttonText={<Trans>Against</Trans>}
              buttonIcon={<></>}
              buttonStyle={NavBarButtonStyle.AGAINST_VOTE_SUBMIT}
              className={
                vote === Vote.AGAINST
                  ? ''
                  : vote === undefined
                  ? classes.inactive
                  : classes.unselected
              }
            />
          </div>
          <br />
          <div onClick={() => setVote(Vote.ABSTAIN)}>
            <NavBarButton
              buttonText={<Trans>Abstain</Trans>}
              buttonIcon={<></>}
              buttonStyle={NavBarButtonStyle.ABSTAIN_VOTE_SUBMIT}
              className={
                vote === Vote.ABSTAIN
                  ? ''
                  : vote === undefined
                  ? classes.inactive
                  : classes.unselected
              }
            />
          </div>
          <br />
          <FloatingLabel controlId="reasonTextarea" label={<Trans>Reason (Optional)</Trans>}>
            <FormControl
              as="textarea"
              placeholder={
                i18n.locale === 'en' ? `Reason for voting ${Vote[vote ?? Vote.FOR]}` : ''
              }
              value={voteReason}
              onChange={e => setVoteReason(e.target.value)}
              className={classes.voteReasonTextarea}
            />
          </FloatingLabel>
          <br />
          <Button
            onClick={() => {
              if (vote === undefined || !proposalId || isLoading) {
                return;
              }
              setIsLoading(true);
              if (voteReason.trim() === '') {
                castVote(proposalId, vote);
              } else {
                castVoteWithReason(proposalId, vote, voteReason);
              }
            }}
            className={vote === undefined ? classes.submitBtnDisabled : classes.submitBtn}
          >
            {isLoading ? <Spinner animation="border" /> : <Trans>Submit Vote</Trans>}
          </Button>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              marginTop: '0.5rem',
            }}
          >
            <span
              style={{
                fontFamily: 'PT Root UI',
                fontSize: '14px',
                color: 'var(--brand-gray-light-text)',
                opacity: '75%',
                width: 'fit-content',
              }}
            >
              Gas spent on voting will be refunded to you
            </span>
          </div>
        </div>
      )}
    </>
  );

  // On modal dismiss, reset non-success state
  const resetNonSuccessStateAndHideModal = () => {
    setIsLoading(false);
    setIsVoteFailed(false);
    setErrorMessage('');
    setFailureCopy('');
    onHide();
  };

  return (
    <>
      <SolidColorBackgroundModal
        show={show}
        onDismiss={resetNonSuccessStateAndHideModal}
        content={voteModalContent}
      />
    </>
  );
};
export default VoteModal;
