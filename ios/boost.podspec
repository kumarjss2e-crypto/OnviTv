Pod::Spec.new do |s|
  s.name     = "boost"
  s.version  = "1.83.0"
  s.summary  = "Boost C++ Libraries"
  s.homepage = "https://www.boost.org"
  s.license  = "Boost Software License"
  s.author   = { "Boost" => "https://www.boost.org" }
  s.source   = { 
    :http => "https://github.com/react-native-community/boost-for-react-native/releases/download/v1.83.0-0/boost-headers.tar.gz",
    :sha256 => "6478edfe2f3305127cffe8caf73ea0176c53769f4bf1585be237eb30798c3b8e"
  }
  s.requires_arc = false
  s.platform = :ios, "11.0"
  s.header_dir = "boost"
  s.source_files = "boost/**/*.{hpp,h}"
  s.header_mappings_dir = "."
  s.preserve_paths = "boost/**/*.{hpp,h}", "libs/**/*"
end
