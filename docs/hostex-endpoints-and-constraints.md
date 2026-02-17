# Hostex Endpoints and Constraints

This reference maps MCP tool families to Hostex endpoint behavior, required inputs, payload caveats, and rate-limit handling used by this server.

## Global Gateway and Rate-Limit Notes

- All tools execute through `HostexGateway` with centralized retry, timeout, and Bottleneck throttling.
- The server parses `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` only when response headers are available in the client response path.
- Hostex success-response headers are not guaranteed to be exposed by `hostex-ts` in all code paths; when header metadata is absent, conservative local throttling defaults apply (`maxConcurrent=3`, `minTimeMs=150`).
- Tool output is validated against local response schemas before MCP return. Validation mismatch returns a sanitized tool error payload.

## Properties Family

Tools: `hostex_list_properties`, `hostex_list_room_types`

- Primary use: inventory discovery and property metadata lookup.
- Required inputs:
  - `hostex_list_properties`: none.
  - `hostex_list_room_types`: none.
- Optional filters:
  - Both support `offset` and `limit` pagination.
  - `hostex_list_properties` also supports optional `id` for direct property lookup.
- Output behavior: validated list payloads in Hostex response envelope; property coordinate values can vary in shape across live responses, but stable required fields are enforced by schema.

## Reservations and Availability Family

Tools: `hostex_list_reservations`, `hostex_create_reservation`, `hostex_cancel_reservation`, `hostex_update_lock_code`, `hostex_get_custom_fields`, `hostex_update_custom_fields`, `hostex_list_availabilities`, `hostex_update_availabilities`

- Primary use: reservation lifecycle management, stay metadata updates, and calendar availability controls.
- Required inputs and quirks:
  - `hostex_list_reservations`: no hard-required field, but filtering by `property_id` and date windows is strongly recommended for large datasets.
  - `hostex_create_reservation`: requires `property_id`, `custom_channel_id`, `check_in_date`, `check_out_date`, `guest_name`, `currency`, `rate_amount`, `commission_amount`, `received_amount`, and `income_method_id`.
  - `hostex_cancel_reservation`: requires `reservation_code`; this endpoint is only valid for direct/custom-channel bookings, not all OTA/channel-managed reservations.
  - `hostex_update_lock_code`: requires `stay_code` and non-empty `lock_code`.
  - `hostex_get_custom_fields`: requires `stay_code`.
  - `hostex_update_custom_fields`: requires `stay_code` and `custom_fields` object; values are accepted as heterogeneous JSON-compatible data.
  - `hostex_list_availabilities`: requires comma-separated string `property_ids`, plus `start_date` and `end_date`.
  - `hostex_update_availabilities`: requires `property_ids` array (max 100) and `available`; use either `start_date`/`end_date` or explicit `dates`.
- Output behavior: mutation endpoints often return empty-success style payloads; these are normalized into MCP-safe result text/content by the tool layer.

## Conversations Family

Tools: `hostex_list_conversations`, `hostex_get_conversation`, `hostex_send_message`

- Primary use: inbox triage and guest communication workflows.
- Required inputs and quirks:
  - `hostex_list_conversations`: none; supports pagination.
  - `hostex_get_conversation`: requires `conversation_id`.
  - `hostex_send_message`: requires `conversation_id` and at least one of `message` or `jpeg_base64`.
- Payload notes:
  - `jpeg_base64` is expected as base64-encoded JPEG content.
  - Message send results are validated and surfaced as success/error envelopes.

## Reviews Family

Tools: `hostex_list_reviews`, `hostex_create_review`

- Primary use: review reporting and host-response workflows.
- Required inputs and quirks:
  - `hostex_list_reviews`: none; supports optional `reservation_code`, `property_id`, `review_status`, check-out date range, and pagination.
  - `hostex_create_review`: requires `reservation_code`; supports optional `host_review_score` (0-5), `host_review_content`, and `host_reply_content`.
- Output behavior: validated review list and mutation acknowledgement payloads.

## Webhooks Family

Tools: `hostex_list_webhooks`, `hostex_create_webhook`, `hostex_delete_webhook`

- Primary use: webhook endpoint registration and lifecycle maintenance.
- Required inputs and quirks:
  - `hostex_list_webhooks`: none.
  - `hostex_create_webhook`: requires valid URL in `url`.
  - `hostex_delete_webhook`: requires numeric `webhook_id`; only Hostex-manageable webhook entries can be deleted.
- Limitation note: webhook signature verification behavior/header semantics are not defined by this MCP server. Treat inbound webhook requests as untrusted and enforce verification in the receiving service where supported by Hostex documentation.

## Listings Family

Tools: `hostex_get_listing_calendar`, `hostex_update_listing_prices`

- Primary use: OTA listing calendar reads and per-date price pushes.
- Required inputs and quirks:
  - `hostex_get_listing_calendar`: requires `start_date`, `end_date`, and `listings[]` with `channel_type` + `listing_id` per entry.
  - `hostex_update_listing_prices`: requires `channel_type`, `listing_id`, and `prices[]` where each item has `date` and non-negative `price`.
- Output behavior: validated listing calendar/price update payloads.

## Meta Options Family

Tools: `hostex_list_custom_channels`, `hostex_list_income_methods`

- Primary use: lookup dictionaries needed by reservation creation and billing classification workflows.
- Required inputs: none.
- Output behavior: validated custom-channel and income-method catalogs that should be treated as source-of-truth option IDs for downstream mutation tools.
