package com.interview.platform.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class JwtService {

    @Value("${JWT_SECRET:}")
    private String secret;

    private static final long EXPIRY_SECONDS =
            60L * 60L * 24L * 7L;

    private static final String HEADER_JSON =
            "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";

    public String generateToken(String email) {

        validateSecret();

        long expiresAt =
                Instant.now()
                        .getEpochSecond()
                        + EXPIRY_SECONDS;

        String payload =
                "{\"sub\":\""
                        + escapeJson(email)
                        + "\",\"exp\":"
                        + expiresAt
                        + "}";

        String header =
                base64Url(
                        HEADER_JSON
                                .getBytes(
                                        StandardCharsets.UTF_8
                                )
                );

        String body =
                base64Url(
                        payload.getBytes(
                                StandardCharsets.UTF_8
                        )
                );

        String unsigned =
                header + "." + body;

        String signature =
                sign(unsigned);

        return unsigned
                + "."
                + signature;
    }

    public String extractEmail(String token) {

        validateSecret();

        if (token == null ||
                token.isBlank()) {

            return null;
        }

        String[] pieces =
                token.split("\\.");

        if (pieces.length != 3) {
            return null;
        }

        String unsigned =
                pieces[0]
                        + "."
                        + pieces[1];

        byte[] expected =
                sign(unsigned)
                        .getBytes(
                                StandardCharsets.UTF_8
                        );

        byte[] supplied =
                pieces[2]
                        .getBytes(
                                StandardCharsets.UTF_8
                        );

        if (!MessageDigest.isEqual(
                expected,
                supplied
        )) {

            return null;
        }

        String payload =
                new String(
                        Base64.getUrlDecoder()
                                .decode(
                                        pieces[1]
                                ),
                        StandardCharsets.UTF_8
                );

        Matcher subjectMatcher =
                Pattern.compile(
                        "\"sub\":\"([^\"]+)\""
                )
                .matcher(payload);

        Matcher expiryMatcher =
                Pattern.compile(
                        "\"exp\":(\\d+)"
                )
                .matcher(payload);

        if (!subjectMatcher.find() ||
                !expiryMatcher.find()) {

            return null;
        }

        long expiry =
                Long.parseLong(
                        expiryMatcher.group(1)
                );

        if (Instant.now()
                .getEpochSecond() > expiry) {

            return null;
        }

        return subjectMatcher
                .group(1)
                .replace("\\\"", "\"")
                .replace("\\\\", "\\");
    }

    private String sign(String input) {

        try {

            Mac mac =
                    Mac.getInstance(
                            "HmacSHA256"
                    );

            mac.init(
                    new SecretKeySpec(
                            secret.getBytes(
                                    StandardCharsets.UTF_8
                            ),
                            "HmacSHA256"
                    )
            );

            return base64Url(
                    mac.doFinal(
                            input.getBytes(
                                    StandardCharsets.UTF_8
                            )
                    )
            );

        } catch (Exception e) {

            throw new IllegalStateException(
                    "Unable to generate JWT signature.",
                    e
            );
        }
    }

    private String base64Url(
            byte[] value
    ) {

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(value);
    }

    private String escapeJson(
            String value
    ) {

        if (value == null) {
            return "";
        }

        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    private void validateSecret() {

        if (secret == null ||
                secret.length() < 32) {

            throw new IllegalStateException(
                    "JWT_SECRET must be configured with at least 32 characters."
            );
        }
    }
}