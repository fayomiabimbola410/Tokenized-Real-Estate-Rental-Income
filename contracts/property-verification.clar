;; Property Verification Contract
;; This contract validates property ownership and condition

(define-data-var contract-owner principal tx-sender)

;; Property struct
(define-map properties
  { property-id: uint }
  {
    owner: principal,
    verified: bool,
    address: (string-ascii 256),
    last-inspection-date: uint,
    condition-score: uint
  }
)

;; Initialize contract owner
(define-public (initialize-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u100))
    (ok true)
  )
)

;; Register a new property
(define-public (register-property
    (property-id uint)
    (address (string-ascii 256))
  )
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u101))
    (map-insert properties
      { property-id: property-id }
      {
        owner: tx-sender,
        verified: false,
        address: address,
        last-inspection-date: u0,
        condition-score: u0
      }
    )
    (ok true)
  )
)

;; Verify a property after inspection
(define-public (verify-property
    (property-id uint)
    (condition-score uint)
  )
  (let (
    (property (unwrap! (map-get? properties { property-id: property-id }) (err u102)))
  )
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u103))
    (map-set properties
      { property-id: property-id }
      (merge property {
        verified: true,
        last-inspection-date: block-height,
        condition-score: condition-score
      })
    )
    (ok true)
  )
)

;; Get property details
(define-read-only (get-property (property-id uint))
  (map-get? properties { property-id: property-id })
)

;; Check if property is verified
(define-read-only (is-property-verified (property-id uint))
  (default-to false (get verified (map-get? properties { property-id: property-id })))
)

;; Transfer property ownership
(define-public (transfer-property-ownership
    (property-id uint)
    (new-owner principal)
  )
  (let (
    (property (unwrap! (map-get? properties { property-id: property-id }) (err u104)))
  )
    (asserts! (is-eq tx-sender (get owner property)) (err u105))
    (map-set properties
      { property-id: property-id }
      (merge property { owner: new-owner })
    )
    (ok true)
  )
)
