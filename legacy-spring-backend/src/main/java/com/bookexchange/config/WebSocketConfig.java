package com.bookexchange.config;

import com.bookexchange.service.CustomUserDetailsService;
import com.bookexchange.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP-over-WebSocket chat.
 * Client connects to /ws, subscribes to /topic/offer/{offerId},
 * and sends messages to /app/chat.send.
 *
 * The JWT is sent in the STOMP CONNECT frame (browsers can't set headers on
 * the SockJS handshake), so it is validated here by a channel interceptor.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");

                    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                        throw new MessageDeliveryException("Missing JWT in STOMP CONNECT");
                    }

                    try {
                        String token = authHeader.substring(7);
                        String username = jwtUtil.extractUsername(token);
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                        if (!jwtUtil.isTokenValid(token, userDetails)) {
                            throw new MessageDeliveryException("Invalid JWT");
                        }

                        accessor.setUser(new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities()));
                    } catch (MessageDeliveryException e) {
                        throw e;
                    } catch (Exception e) {
                        throw new MessageDeliveryException("JWT validation failed: " + e.getMessage());
                    }
                }
                return message;
            }
        });
    }
}
