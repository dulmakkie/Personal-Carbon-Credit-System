;; Carbon Credit Contract

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_INSUFFICIENT_BALANCE (err u101))
(define-constant ERR_INVALID_AMOUNT (err u102))

;; Define the fungible token for carbon credits
(define-fungible-token carbon-credit)

;; Data Maps
(define-map user-data
  principal
  {
    carbon-footprint: uint,
    last-update: uint
  }
)

;; Public Functions

;; Initialize a user's account
(define-public (initialize-user)
  (let
    (
      (user tx-sender)
    )
    (ok (map-set user-data
      user
      {
        carbon-footprint: u0,
        last-update: block-height
      }
    ))
  )
)

;; Update user's carbon footprint
(define-public (update-carbon-footprint (amount uint))
  (let
    (
      (user tx-sender)
      (user-info (default-to { carbon-footprint: u0, last-update: u0 } (map-get? user-data user)))
    )
    (ok (map-set user-data
      user
      (merge user-info
        {
          carbon-footprint: (+ (get carbon-footprint user-info) amount),
          last-update: block-height
        }
      )
    ))
  )
)

;; Mint carbon credits (only contract owner)
(define-public (mint-credits (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (ft-mint? carbon-credit amount recipient)
  )
)

;; Transfer carbon credits
(define-public (transfer-credits (amount uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_UNAUTHORIZED)
    (ft-transfer? carbon-credit amount sender recipient)
  )
)

;; Burn carbon credits
(define-public (burn-credits (amount uint) (owner principal))
  (begin
    (asserts! (is-eq tx-sender owner) ERR_UNAUTHORIZED)
    (ft-burn? carbon-credit amount owner)
  )
)

;; Read-only functions

;; Get user's carbon footprint
(define-read-only (get-carbon-footprint (user principal))
  (ok (get carbon-footprint (default-to { carbon-footprint: u0, last-update: u0 } (map-get? user-data user))))
)

;; Get user's credit balance
(define-read-only (get-credit-balance (user principal))
  (ok (ft-get-balance carbon-credit user))
)
