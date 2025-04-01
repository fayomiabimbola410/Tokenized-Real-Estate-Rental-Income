;; Rental Agreement Contract
;; This contract manages rental terms with tenants

(define-data-var contract-owner principal tx-sender)

;; Rental agreement struct
(define-map rental-agreements
  { agreement-id: uint }
  {
    property-id: uint,
    tenant: principal,
    start-date: uint,
    end-date: uint,
    monthly-rent: uint,
    security-deposit: uint,
    active: bool
  }
)

;; Property to agreement mapping
(define-map property-agreements
  { property-id: uint }
  { agreement-id: uint }
)

;; Initialize contract
(define-public (initialize-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u100))
    (ok true)
  )
)

;; Create a new rental agreement
(define-public (create-rental-agreement
    (agreement-id uint)
    (property-id uint)
    (tenant principal)
    (start-date uint)
    (end-date uint)
    (monthly-rent uint)
    (security-deposit uint)
  )
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u101))
    (map-insert rental-agreements
      { agreement-id: agreement-id }
      {
        property-id: property-id,
        tenant: tenant,
        start-date: start-date,
        end-date: end-date,
        monthly-rent: monthly-rent,
        security-deposit: security-deposit,
        active: true
      }
    )
    (map-insert property-agreements
      { property-id: property-id }
      { agreement-id: agreement-id }
    )
    (ok true)
  )
)

;; Terminate a rental agreement
(define-public (terminate-agreement (agreement-id uint))
  (let (
    (agreement (unwrap! (map-get? rental-agreements { agreement-id: agreement-id }) (err u102)))
  )
    (asserts! (or (is-eq tx-sender (var-get contract-owner)) (is-eq tx-sender (get tenant agreement))) (err u103))
    (map-set rental-agreements
      { agreement-id: agreement-id }
      (merge agreement { active: false })
    )
    (ok true)
  )
)

;; Extend a rental agreement
(define-public (extend-agreement
    (agreement-id uint)
    (new-end-date uint)
  )
  (let (
    (agreement (unwrap! (map-get? rental-agreements { agreement-id: agreement-id }) (err u104)))
  )
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u105))
    (asserts! (get active agreement) (err u106))
    (map-set rental-agreements
      { agreement-id: agreement-id }
      (merge agreement { end-date: new-end-date })
    )
    (ok true)
  )
)

;; Get rental agreement details
(define-read-only (get-agreement (agreement-id uint))
  (map-get? rental-agreements { agreement-id: agreement-id })
)

;; Get agreement for a property
(define-read-only (get-property-agreement (property-id uint))
  (map-get? property-agreements { property-id: property-id })
)

;; Check if agreement is active
(define-read-only (is-agreement-active (agreement-id uint))
  (default-to false (get active (map-get? rental-agreements { agreement-id: agreement-id })))
)
