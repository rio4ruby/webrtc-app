require 'bundler'

#make sure all gems are installed
Bundler.require
require_relative './webrtc'

run WebRTC
