class PermanentError(Exception):
    """A failure that retrying won't fix: bad input, missing credentials, a refusal.

    The worker marks the job as failed right away instead of re-queuing it.
    """
