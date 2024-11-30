;; Carbon Credit Marketplace Contract

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_INSUFFICIENT_BALANCE (err u101))
(define-constant ERR_INVALID_AMOUNT (err u102))
(define-constant ERR_LISTING_NOT_FOUND (err u103))

;; Data Maps
(define-map listings
  uint
  {
    seller: principal,
    amount: uint,
    price: uint
  }
)

(define-data-var next-listing-id uint u0)

;; Public Functions

;; Create a new listing
(define-public (create-listing (amount uint) (price uint))
  (let
    (
      (listing-id (var-get next-listing-id))
    )
    (try! (contract-call? .carbon-credit transfer-credits amount tx-sender (as-contract tx-sender)))
    (map-set listings listing-id { seller: tx-sender, amount: amount, price: price })
    (var-set next-listing-id (+ listing-id u1))
    (ok listing-id)
  )
)

;; Cancel a listing
(define-public (cancel-listing (listing-id uint))
  (let
    (
      (listing (unwrap! (map-get? listings listing-id) ERR_LISTING_NOT_FOUND))
    )
    (asserts! (is-eq (get seller listing) tx-sender) ERR_UNAUTHORIZED)
    (try! (as-contract (contract-call? .carbon-credit transfer-credits (get amount listing) (as-contract tx-sender) tx-sender)))
    (map-delete listings listing-id)
    (ok true)
  )
)

;; Purchase credits from a listing
(define-public (purchase-listing (listing-id uint))
  (let
    (
      (listing (unwrap! (map-get? listings listing-id) ERR_LISTING_NOT_FOUND))
      (total-price (get price listing))
    )
    (try! (stx-transfer? total-price tx-sender (get seller listing)))
    (try! (as-contract (contract-call? .carbon-credit transfer-credits (get amount listing) (as-contract tx-sender) tx-sender)))
    (map-delete listings listing-id)
    (ok true)
  )
)

;; Purchase carbon offset
(define-public (purchase-offset (amount uint))
  (let
    (
      (price-per-credit u10) ;; Example: 10 STX per credit
      (total-price (* amount price-per-credit))
    )
    (try! (stx-transfer? total-price tx-sender (as-contract tx-sender)))
    (try! (contract-call? .carbon-credit burn-credits amount tx-sender))
    (ok true)
  )
)

;; Read-only functions

;; Get listing details
(define-read-only (get-listing (listing-id uint))
  (map-get? listings listing-id)
)

;; Get the current listing ID
(define-read-only (get-current-listing-id)
  (var-get next-listing-id)
)

