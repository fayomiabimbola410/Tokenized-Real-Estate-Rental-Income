;; Maintenance Management Contract
;; This contract handles property maintenance expenses

(define-data-var contract-owner principal tx-sender)

;; Maintenance request struct
(define-map maintenance-requests
  { request-id: uint }
  {
    property-id: uint,
    description: (string-ascii 256),
    estimated-cost: uint,
    actual-cost: uint,
    status: (string-ascii 20), ;; "pending", "approved", "completed", "rejected"
    request-date: uint,
    completion-date: uint
  }
)

;; Property maintenance fund
(define-map maintenance-funds
  { property-id: uint }
  {
    balance: uint,
    total-spent: uint
  }
)

;; Initialize contract
(define-public (initialize-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u100))
    (ok true)
  )
)

;; Create a maintenance fund for a property
(define-public (create-maintenance-fund
    (property-id uint)
    (initial-balance uint)
  )
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u101))
    (map-insert maintenance-funds
      { property-id: property-id }
      {
        balance: initial-balance,
        total-spent: u0
      }
    )
    (ok true)
  )
)

;; Add funds to maintenance fund
(define-public (add-to-maintenance-fund
    (property-id uint)
    (amount uint)
  )
  (let (
    (fund (unwrap! (map-get? maintenance-funds { property-id: property-id }) (err u102)))
  )
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u103))
    (map-set maintenance-funds
      { property-id: property-id }
      (merge fund {
        balance: (+ (get balance fund) amount)
      })
    )
    (ok true)
  )
)

;; Submit a maintenance request
(define-public (submit-maintenance-request
    (request-id uint)
    (property-id uint)
    (description (string-ascii 256))
    (estimated-cost uint)
  )
  (begin
    (map-insert maintenance-requests
      { request-id: request-id }
      {
        property-id: property-id,
        description: description,
        estimated-cost: estimated-cost,
        actual-cost: u0,
        status: "pending",
        request-date: block-height,
        completion-date: u0
      }
    )
    (ok true)
  )
)

;; Approve a maintenance request
(define-public (approve-maintenance-request (request-id uint))
  (let (
    (request (unwrap! (map-get? maintenance-requests { request-id: request-id }) (err u104)))
  )
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u105))
    (asserts! (is-eq (get status request) "pending") (err u106))

    (map-set maintenance-requests
      { request-id: request-id }
      (merge request { status: "approved" })
    )
    (ok true)
  )
)

;; Complete a maintenance request
(define-public (complete-maintenance-request
    (request-id uint)
    (actual-cost uint)
  )
  (let (
    (request (unwrap! (map-get? maintenance-requests { request-id: request-id }) (err u107)))
    (fund (unwrap! (map-get? maintenance-funds { property-id: (get property-id request) }) (err u108)))
  )
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u109))
    (asserts! (is-eq (get status request) "approved") (err u110))
    (asserts! (<= actual-cost (get balance fund)) (err u111))

    ;; Update request status
    (map-set maintenance-requests
      { request-id: request-id }
      (merge request {
        status: "completed",
        actual-cost: actual-cost,
        completion-date: block-height
      })
    )

    ;; Update maintenance fund
    (map-set maintenance-funds
      { property-id: (get property-id request) }
      {
        balance: (- (get balance fund) actual-cost),
        total-spent: (+ (get total-spent fund) actual-cost)
      }
    )

    (ok true)
  )
)

;; Reject a maintenance request
(define-public (reject-maintenance-request (request-id uint))
  (let (
    (request (unwrap! (map-get? maintenance-requests { request-id: request-id }) (err u112)))
  )
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u113))
    (asserts! (is-eq (get status request) "pending") (err u114))

    (map-set maintenance-requests
      { request-id: request-id }
      (merge request { status: "rejected" })
    )
    (ok true)
  )
)

;; Get maintenance request details
(define-read-only (get-maintenance-request (request-id uint))
  (map-get? maintenance-requests { request-id: request-id })
)

;; Get maintenance fund details
(define-read-only (get-maintenance-fund (property-id uint))
  (map-get? maintenance-funds { property-id: property-id })
)
