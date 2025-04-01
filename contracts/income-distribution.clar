;; Income Distribution Contract
;; This contract allocates rent payments to token holders

(define-data-var contract-owner principal tx-sender)

;; Token information
(define-fungible-token property-token)

;; Property token details
(define-map property-tokens
  { property-id: uint }
  {
    total-supply: uint,
    token-price: uint,
    total-distributed: uint
  }
)

;; Rent payment records
(define-map rent-payments
  { payment-id: uint }
  {
    property-id: uint,
    amount: uint,
    payment-date: uint,
    distributed: bool
  }
)

;; Initialize contract
(define-public (initialize-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u100))
    (ok true)
  )
)

;; Create tokens for a property
(define-public (create-property-tokens
    (property-id uint)
    (total-supply uint)
    (token-price uint)
  )
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u101))
    (map-insert property-tokens
      { property-id: property-id }
      {
        total-supply: total-supply,
        token-price: token-price,
        total-distributed: u0
      }
    )
    (ft-mint? property-token total-supply tx-sender)
  )
)

;; Purchase property tokens
(define-public (purchase-tokens
    (property-id uint)
    (amount uint)
  )
  (let (
    (token-info (unwrap! (map-get? property-tokens { property-id: property-id }) (err u102)))
    (price (* amount (get token-price token-info)))
  )
    ;; In a real implementation, this would include STX transfer
    ;; For simplicity, we're just transferring tokens
    (ft-transfer? property-token amount tx-sender (var-get contract-owner))
  )
)

;; Record a rent payment
(define-public (record-rent-payment
    (payment-id uint)
    (property-id uint)
    (amount uint)
  )
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u103))
    (map-insert rent-payments
      { payment-id: payment-id }
      {
        property-id: property-id,
        amount: amount,
        payment-date: block-height,
        distributed: false
      }
    )
    (ok true)
  )
)

;; Distribute rent payment to token holders
;; In a real implementation, this would calculate each holder's share
;; For simplicity, we're just marking the payment as distributed
(define-public (distribute-payment (payment-id uint))
  (let (
    (payment (unwrap! (map-get? rent-payments { payment-id: payment-id }) (err u104)))
    (token-info (unwrap! (map-get? property-tokens { property-id: (get property-id payment) }) (err u105)))
  )
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u106))
    (asserts! (not (get distributed payment)) (err u107))

    ;; Update payment record
    (map-set rent-payments
      { payment-id: payment-id }
      (merge payment { distributed: true })
    )

    ;; Update total distributed
    (map-set property-tokens
      { property-id: (get property-id payment) }
      (merge token-info {
        total-distributed: (+ (get total-distributed token-info) (get amount payment))
      })
    )

    (ok true)
  )
)

;; Get token information for a property
(define-read-only (get-property-token-info (property-id uint))
  (map-get? property-tokens { property-id: property-id })
)

;; Get payment information
(define-read-only (get-payment-info (payment-id uint))
  (map-get? rent-payments { payment-id: payment-id })
)

;; Get token balance for an address
(define-read-only (get-token-balance (address principal))
  (ft-get-balance property-token address)
)
