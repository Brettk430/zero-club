import UIKit
import Capacitor
import AuthenticationServices
import CryptoKit

// Native Sign in with Apple: the system sheet with Face ID, rather than a web
// page asking for an Apple ID password. Written here instead of pulled in as a
// dependency — the community plugin pins Capacitor below 8, and the Capacitor 8
// alternative links Facebook's and Google's SDKs into the app regardless of use.
//
// Returns Apple's signed identity token, which Supabase verifies, and the
// one-time authorization code the server trades for the refresh token it must
// revoke when the member deletes their account.
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin,
                                ASAuthorizationControllerDelegate,
                                ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?

    @objc func authorize(_ call: CAPPluginCall) {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        // Email only. The name is never shown — members are a handle first, and
        // Apple asks that apps not request what they won't use.
        request.requestedScopes = [.email]
        // Apple gets the SHA-256 of a one-time value and bakes it into the
        // identity token; Supabase gets the raw value and checks they match, so
        // a token lifted from elsewhere can't be replayed. Hashed here rather
        // than in the web view, whose crypto.subtle depends on a secure context.
        if let raw = call.getString("nonce") {
            request.nonce = SHA256.hash(data: Data(raw.utf8)).map { String(format: "%02x", $0) }.joined()
        }

        pendingCall = call
        DispatchQueue.main.async {
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.webView?.window ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pendingCall else { return }
        pendingCall = nil
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8) else {
            call.reject("Apple did not return an identity token")
            return
        }
        call.resolve([
            "identityToken": identityToken,
            "authorizationCode": credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) } ?? "",
            "user": credential.user,
            "email": credential.email ?? ""
        ])
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithError error: Error) {
        guard let call = pendingCall else { return }
        pendingCall = nil
        // Closing the sheet is a choice, not a failure; the app stays quiet about it.
        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            call.reject("Canceled", "CANCELED")
            return
        }
        call.reject(error.localizedDescription, "FAILED")
    }
}

// The storyboard hosts this instead of Capacitor's stock controller, solely to
// register the plugin above — local plugins aren't discovered automatically.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleSignInPlugin())
    }
}
