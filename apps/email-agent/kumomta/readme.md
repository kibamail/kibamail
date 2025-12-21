# Traffic Sink Example

This directory contains a docker compose file that will spawn kumod (the MTA
process) in a _sink_ configuration. The SMTP service will pretend to accept
most mail and then simply discard it. For the messages it doesn't accept, it
will return a failure response based on the contents of the
[policy/responses.toml](policy/responses.toml) file.

That file encodes the chances of returning a bounce or a transient failure,
with that chance being configurable based on the recipient domain. In
addition, certain recipient domains include a sample of realistic
error responses that have been observed to be produced by that domain
in real production traffic.

In addition to that probabilistic bounce behavior, you can explicitly
choose a class of response by varying the user portion of the recipient
address:

- if the user includes `tempfail` a `400 tempfail requested` response will be generated
- if the user includes `permfail` a `500 permfail requested` response will be generated
- If the user starts with `450-` then response will be `450 you said USER`.
- If the user starts with `250-` then message will be accepted and discarded, ignoring the probabilistic bounce settings.
